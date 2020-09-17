const tmp = require("tmp");
const path = require("path");
const fs = require("fs");
const debug = require("debug")("fulcrum");
const child_process = require("child_process");
const semverDiff = require("semver/functions/diff");
const { promisify } = require("util");

const copyFile = promisify(fs.copyFile);
const writeFile = promisify(fs.writeFile);
const exec = promisify(child_process.exec);

function humanFileSize(bytes, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
}

function isNestedNodeModules(directory) {
  const re = /(node_modules)/g;
  return ((directory || "").match(re) || []).length;
}

function walkTree(report, callback) {
  if (Array.isArray(report)) {
    report.forEach((dependency) => {
      callback(dependency);

      if (dependency.dependencies) {
        walkTree(dependency.dependencies, callback);
      }
    });
  } else {
    Object.keys(report).forEach((dependency) => {
      callback(report[dependency]);

      if (dependency.dependencies) {
        walkTree(dependency.dependencies, callback);
      }
    });
  }
}

function duplicateDependencies(report) {
  const dependencies = {};

  walkTree(report, (dependency) => {
    const { name, version, directory, size } = dependency;

    if (isNestedNodeModules(directory) > 1) {
      if (!dependencies[name]) {
        dependencies[name] = [];
      }

      dependencies[name].push({
        message: `Duplicate package found at ${directory} for ${name} with a version of ${version}. This takes up an additional ${humanFileSize(
          size
        )}.`,
        directory,
        size,
      });
    }
  });

  const actions = Object.keys(dependencies)
    .map((key) => dependencies[key])
    .reduce((total, arr) => [...total, ...arr], []);

  return {
    message: `There are currently ${Object.keys(dependencies).reduce(
      (total, dep) => total + dep.length,
      0
    )} duplicates. This contributes to an additional ${humanFileSize(
      actions.reduce((total, action) => (total += action.size), 0)
    )} disk space being used.`,
    actions,
  };
}

function versionsBeingPinned(report) {
  const pinnedVersions = [];

  walkTree(report, (dependency) => {
    const { name, directory, dependencies } = dependency;

    Object.keys(dependencies).forEach((depName) => {
      if (
        dependencies[depName] &&
        dependencies[depName].version &&
        dependencies[depName].version.includes("~")
      ) {
        pinnedVersions.push({
          message: `${name} has a pinned version for ${depName}@${dependencies[depName]}. This will never resolve at the top level.`,
          directory,
        });
      }
    });
  });

  return {
    message: `There are currently ${pinnedVersions.length} dependencies being pinned. This will result in not having dependencies being hoisted.`,
    actions: pinnedVersions,
  };
}

// What dependencies you are bringing in that don't absorb into the semver ranges at the top level
function notBeingObsorbedByTopLevel(report) {
  const topLevel = {};
  report.forEach((dependency, index) => {
    topLevel[dependency.name] = index;
  });

  const notObsorbed = [];
  walkTree(report, (dependency) => {
    const { name, version, directory, size } = dependency;
    const index = topLevel[name];
    if (index) {
      const topLevelDep = report[index];

      if (topLevelDep.version !== version) {
        notObsorbed.push({
          message: `"${name}" not obsorbed because top level dep is "${
            topLevelDep.version
          }" and this is "${version}". This takes up an additional ${humanFileSize(
            size
          )}`,
          directory,
          size,
        });
      }
    }
  });

  return {
    message: `There are currently ${
      notObsorbed.length
    } duplicate packages being installed on disk because they are not being obsorbed into the top level semver range. This equates to a total of ${humanFileSize(
      notObsorbed.reduce((total, dep) => total + dep.size, 0)
    )}`,
    actions: notObsorbed.sort((a, b) => b.size - a.size),
  };
}

// What percentage of your nested dependencies do you bring in that are out of date (major, minor, patch)
function dependencyFreshness(report) {
  const outOfDate = { major: [], minor: [], patch: [] };
  let totalDeps = 0;

  walkTree(report, (depdency) => {
    totalDeps += 1;

    const diff = semverDiff(depdency.version, depdency.latest);
    if (diff === "major") {
      outOfDate.major.push(depdency);
    }

    if (diff === "minor") {
      outOfDate.minor.push(depdency);
    }

    if (diff === "patch") {
      outOfDate.patch.push(depdency);
    }
  });

  return {
    message: `Your sub packages currently have; ${
      outOfDate.major.length
    } major versions out of date (${
      (outOfDate.major.length / totalDeps) * 100
    }%), ${outOfDate.minor.length} minor versions out of date (${
      (outOfDate.minor.length / totalDeps) * 100
    }%), ${outOfDate.patch.length} patch versions out of date (${
      (outOfDate.patch.length / totalDeps) * 100
    }%)`,
    actions: outOfDate,
  };
}

async function contextualizeDependencyTree(mapping) {
  const lookupMap = {};

  mapping.forEach((d) => {
    if (!lookupMap[d.name]) {
      lookupMap[d.name] = [];
    }
    lookupMap[d.name].push({ ...d });
  });

  const fakePackageJson = { dependencies: {} };
  Object.keys(lookupMap).forEach((key) => {
    // ignore linked packages
    if (lookupMap[key][0].isSymbolicLink === false) {
      fakePackageJson.dependencies[key] = "*";
    }
  });

  const tmpobj = tmp.dirSync({ unsafeCleanup: true });
  debug("Dir: ", tmpobj.name);

  await writeFile(
    path.resolve(tmpobj.name, "package.json"),
    JSON.stringify(fakePackageJson)
  );

  let latestPackages = {};
  try {
    await copyFile(
      path.resolve(process.cwd(), ".npmrc"),
      path.resolve(tmpobj.name, ".npmrc")
    );
  } catch (ex) {
    debug("Could not copy .npmrc, using the default npm registry.");
  }

  try {
    await exec("npm outdated --json", {
      cwd: tmpobj.name,
    });
  } catch ({ stdout }) {
    latestPackages = JSON.parse(stdout.toString("utf8"));
  }

  tmpobj.removeCallback();

  const resolvedMapping = mapping
    .map((d) => {
      d.latest =
        (latestPackages[d.name] && latestPackages[d.name].latest) || "0.0.0";

      Object.keys(d.dependencies).forEach((key) => {
        const matches = lookupMap[key];

        if (!matches) {
          console.log(
            `dependency not found, parsing error for ${key}. Please report this as a bug`
          );
        }

        if (matches.length === 1) {
          d.dependencies[key] = JSON.parse(
            JSON.stringify({
              ...matches[0],
              latest: latestPackages[key].latest,
              deduped: true,
            })
          );
        } else {
          const found = matches.find((match) =>
            match.directory.includes(d.directory)
          );
          if (found) {
            d.dependencies[key] = JSON.parse(
              JSON.stringify({
                ...found,
                latest: latestPackages[key].latest,
                deduped: false,
              })
            );
          } else {
            // we are looking for the most top level dependency
            const topLevel = matches.find(
              (match) => match.directory === `node_modules/${match.name}`
            );

            d.dependencies[key] = JSON.parse(
              JSON.stringify({
                ...topLevel,
                latest: latestPackages[key].latest,
                deduped: true,
              })
            );
          }
        }
      });

      return d;
    })
    .filter((d) => {
      // we want to filter out any non-top level node_modules
      return d.directory.split("node_modules/").filter((s) => !!s).length == 1;
    });

  return {
    suggestions: [
      versionsBeingPinned(resolvedMapping),
      notBeingObsorbedByTopLevel(resolvedMapping),
      duplicateDependencies(resolvedMapping),
      dependencyFreshness(resolvedMapping),
    ],
    dependencies: resolvedMapping,
  };
}

module.exports = {
  humanFileSize,
  contextualizeDependencyTree,
};
