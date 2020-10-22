const tmp = require("tmp");
const path = require("path");
const fs = require("fs");
const debug = require("debug")("fulcrum");
const child_process = require("child_process");
const semverDiff = require("semver/functions/diff");
const { promisify } = require("util");
const { walkTree, humanFileSize } = require("./utils");

const copyFile = promisify(fs.copyFile);
const writeFile = promisify(fs.writeFile);
const exec = promisify(child_process.exec);

function isNestedNodeModules(directory) {
  const re = /(node_modules)/g;
  return ((directory || "").match(re) || []).length;
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
          meta: {
            directory,
            name,
          },
        });
      }
    });
  });

  return {
    id: "versionsBeingPinned",
    name: "Dependencies with pinned versions",
    message: `There are currently ${pinnedVersions.length} dependencies being pinned. This will result in not having dependencies being hoisted.`,
    actions: pinnedVersions,
  };
}

function topLevelDepsFreshness(report, topLevelPackage) {
  const dependencies = Object.assign(
    {},
    Object.assign({}, topLevelPackage.devDependencies || {}),
    topLevelPackage.dependencies || {}
  );
  const totalDeps = Object.keys(dependencies).length;
  const outOfDate = { major: [], minor: [], patch: [] };
  const seen = [];

  walkTree(report, (dependency) => {
    Object.keys(dependencies).forEach((_dependency) => {
      if (
        _dependency === dependency.name &&
        isNestedNodeModules(dependency.directory) === 1 &&
        !seen.includes(dependency.directory)
      ) {
        // we are using the resolved version instead of the version in the package.json
        const diff = semverDiff(dependency.version, dependency.latest);

        switch (diff) {
          case "major":
            outOfDate.major.push(dependency);
            break;
          case "minor":
            outOfDate.minor.push(dependency);
            break;
          case "patch":
            outOfDate.patch.push(dependency);
            break;
        }

        seen.push(dependency.directory);
      }
    });
  });

  return {
    id: "topLevelDepsFreshness",
    name: "Top Level Dependency Freshness",
    message: `Out of the total ${totalDeps} explicit dependencies defined in the package.json; ${
      outOfDate.major.length
    } major versions out of date (${(
      (outOfDate.major.length / totalDeps) *
      100
    ).toFixed(2)}%), ${outOfDate.minor.length} minor versions out of date (${(
      (outOfDate.minor.length / totalDeps) *
      100
    ).toFixed(2)}%), ${outOfDate.patch.length} patch versions out of date (${(
      (outOfDate.patch.length / totalDeps) *
      100
    ).toFixed(2)}%)`,
    actions: [
      ...outOfDate.major.map(({ name, version, directory, size, latest }) => {
        return {
          message: `"${name}@${version}" is required at ${directory}, the latest is ${latest}. This is a major version out of date.`,
          meta: {
            name,
            directory,
            size,
          },
        };
      }),
      ...outOfDate.minor.map(({ name, version, directory, size, latest }) => {
        return {
          message: `"${name}@${version}" is required at ${directory}, the latest is ${latest}. This is a minor version out of date.`,
          meta: {
            name,
            directory,
            size,
          },
        };
      }),
      ...outOfDate.patch.map(({ name, version, directory, size, latest }) => {
        return {
          message: `"${name}@${version}" is required at ${directory}, the latest is ${latest}. This is a patch version out of date.`,
          meta: {
            name,
            directory,
            size,
          },
        };
      }),
    ],
  };
}

// What dependencies you are bringing in that don't absorb into the semver ranges at the top level
function notBeingAbsorbedByTopLevel(report) {
  const topLevel = {};
  report.forEach((dependency, index) => {
    topLevel[dependency.name] = index;
  });

  const notAbsorbed = [];
  walkTree(report, (dependency) => {
    const { name, version, directory, size } = dependency;
    const index = topLevel[name];
    if (index) {
      const topLevelDep = report[index];

      if (topLevelDep.version !== version) {
        notAbsorbed.push({
          message: `"${name}" not absorbed because top level dep is "${
            topLevelDep.version
          }" and this is "${version}". This takes up an additional ${humanFileSize(
            size
          )}`,
          meta: {
            name,
            directory,
            size,
          },
        });
      }
    }
  });

  return {
    id: "notBeingAbsorbedByTopLevel",
    name: "Dependencies not being absorbed",
    message: `There are currently ${
      notAbsorbed.length
    } duplicate packages being installed on disk because they are not being absorbed into the top level semver range. This equates to a total of ${humanFileSize(
      notAbsorbed.reduce((total, dep) => total + dep.meta.size, 0)
    )}`,
    actions: notAbsorbed.sort((a, b) => b.meta.size - a.meta.size),
  };
}

// What percentage of your nested dependencies do you bring in that are out of date (major, minor, patch)
function nestedDependencyFreshness(report) {
  const seen = [];
  const outOfDate = { major: [], minor: [], patch: [] };
  let totalDeps = 0;

  walkTree(report, (dependency) => {
    if (seen[dependency.directory]) return;

    totalDeps += 1;

    const diff = semverDiff(dependency.version, dependency.latest);
    switch (diff) {
      case "major":
        outOfDate.major.push(dependency);
        break;
      case "minor":
        outOfDate.minor.push(dependency);
        break;
      case "patch":
        outOfDate.patch.push(dependency);
        break;
    }
    seen.push(dependency.directory);
  });

  return {
    id: "nestedDependencyFreshness",
    name: "Nested Dependency Freshness",
    message: `Out of the total ${totalDeps} sub packages currently installed; ${
      outOfDate.major.length
    } major versions out of date (${(
      (outOfDate.major.length / totalDeps) *
      100
    ).toFixed(2)}%), ${outOfDate.minor.length} minor versions out of date (${(
      (outOfDate.minor.length / totalDeps) *
      100
    ).toFixed(2)}%), ${outOfDate.patch.length} patch versions out of date (${(
      (outOfDate.patch.length / totalDeps) *
      100
    ).toFixed(2)}%)`,
    actions: [
      ...outOfDate.major.map(({ name, version, directory, size, latest }) => {
        return {
          message: `"${name}@${version}" is required at ${directory}, the latest is ${latest}. This is a major version out of date.`,
          meta: {
            name,
            directory,
            size,
          },
        };
      }),
      ...outOfDate.minor.map(({ name, version, directory, size, latest }) => {
        return {
          message: `"${name}@${version}" is required at ${directory}, the latest is ${latest}. This is a minor version out of date.`,
          meta: {
            name,
            directory,
            size,
          },
        };
      }),
      ...outOfDate.patch.map(({ name, version, directory, size, latest }) => {
        return {
          message: `"${name}@${version}" is required at ${directory}, the latest is ${latest}. This is a patch version out of date.`,
          meta: {
            name,
            directory,
            size,
          },
        };
      }),
    ],
  };
}

async function contextualizeDependencyTree(mapping, topLevelPackage) {
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

  function decorateSubDependencies(d) {
    Object.keys(d.dependencies).forEach((key) => {
      // if we have already decorated the node don't do it again
      if (!d.dependencies[key].decorated) {
        const matches = lookupMap[key];

        if (!matches) {
          console.log(
            `dependency not found, parsing error for ${key}. Please report this as a bug`
          );
        }

        const match = matches.find((match) =>
          match.directory.includes(d.directory)
        );

        if (match) {
          // if a package has decided to list itself as a dependency delete it.
          if (match.dependencies && match.dependencies[key]) {
            delete match.dependencies[key];
          }

          d.dependencies[key] = {
            ...match,
            latest: latestPackages[key].latest,
            decorated: true,
          };

          if (d.dependencies[key].dependencies) {
            decorateSubDependencies(d.dependencies[key]);
          }
        } else {
          const topLevelPackage = matches.find(
            (match) => match.directory === `node_modules/${match.name}`
          );

          // in order to not have have a cycle we need to remove dependencies from top level objects.
          d.dependencies[key] = {
            ...Object.assign({ ...topLevelPackage }, { dependencies: {} }),
            latest: latestPackages[key].latest,
            decorated: true,
          };
        }
      }
    });

    return d;
  }

  const topLevelMapping = mapping.filter((d) => {
    d.latest =
      (latestPackages[d.name] && latestPackages[d.name].latest) || "0.0.0";

    // we want to filter out any non-top level node_modules
    return d.directory.split("node_modules/").filter((s) => !!s).length == 1;
  });

  const resolvedMapping = topLevelMapping.map((d) => {
    return decorateSubDependencies(d);
  });

  JSON.stringify(resolvedMapping);

  return {
    topLevelPackage,
    suggestions: [
      versionsBeingPinned(resolvedMapping),
      notBeingAbsorbedByTopLevel(resolvedMapping),
      nestedDependencyFreshness(resolvedMapping),
      topLevelDepsFreshness(resolvedMapping, topLevelPackage),
    ],
    dependencies: resolvedMapping,
  };
}

module.exports = {
  contextualizeDependencyTree,
};
