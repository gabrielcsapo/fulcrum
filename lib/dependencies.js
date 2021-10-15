const tmp = require("tmp");
const path = require("path");
const fs = require("fs");
const debug = require("debug")("module-detective");
const child_process = require("child_process");
const semverDiff = require("semver/functions/diff");
const { promisify } = require("util");

const { humanFileSize } = require("./utils");

const copyFile = promisify(fs.copyFile);
const writeFile = promisify(fs.writeFile);
const exec = promisify(child_process.exec);

function getBreadcrumb(node) {
  var bread = [];

  function walk(node) {
    if (bread.includes(node.name)) {
      return bread;
    }

    if (node.edgesIn) {
      const [edge] = [...node.edgesIn.values()];

      if (edge && edge.from) {
        bread.push(edge.name);

        return walk(edge.from);
      } else {
        // we have gotten to the root project, don't push the root project name
        return bread;
      }
    } else {
      return bread;
    }
  }

  return walk(node).reverse().join("#");
}

function getAllFiles(dirPath, exclude, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    const fullPath = path.join(dirPath, file);

    try {
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, exclude, arrayOfFiles);
      } else {
        if (!exclude || (exclude && !exclude.test(fullPath))) {
          arrayOfFiles.push(fullPath);
        }
      }
    } catch (ex) {
      console.log(ex);
    }
  });

  return arrayOfFiles;
}

function getDirectorySize({ directory, exclude }) {
  const arrayOfFiles = getAllFiles(directory, exclude);

  return arrayOfFiles
    .map((filePath) => fs.statSync(filePath).size)
    .reduce((a, b) => a + b, 0);
}

function packagesWithPinnedVersions(dependencyTree) {
  const packagedWithPinned = [];

  for (const node of dependencyTree.inventory.values()) {
    const breadcrumb = getBreadcrumb(node);

    for (const dependencyName in node.packageInfo.dependencies || {}) {
      if (
        node.packageInfo.dependencies[dependencyName].substring(0, 1) === "~"
      ) {
        try {
          const size = getDirectorySize({
            directory: node.edgesOut.get(dependencyName).to.path,
            exclude: new RegExp(path.resolve(node.path, "docs")),
          });

          packagedWithPinned.push({
            message: `"${node.name}" (${breadcrumb}) has a pinned version for ${dependencyName}@${node.packageInfo.dependencies[dependencyName]} that will never collapse.`,
            meta: {
              breadcrumb,
              name: node.name,
              directory: node.path,
              size,
            },
          });
        } catch (ex) {
          console.log(ex);
        }
      }
    }
  }

  return {
    id: "packagesWithPinnedVersions",
    name: "Packages with pinned dependencies",
    message: `There are currently ${
      new Set(packagedWithPinned.map((action) => action.meta.name)).size
    } packages with pinned versions which will never collapse those dependencies causing an additional ${humanFileSize(
      packagedWithPinned.reduce((total, dep) => total + dep.meta.size, 0)
    )}`,
    actions: packagedWithPinned.sort((a, b) => b.meta.size - a.meta.size),
  };
}

function packagesWithExtraArtifacts(dependencyTree) {
  const extraArtifacts = [];

  for (const node of dependencyTree.inventory.values()) {
    const breadcrumb = getBreadcrumb(node);

    if (fs.existsSync(path.resolve(node.path, "docs"))) {
      const size = getDirectorySize({
        directory: node.path,
        exclude: new RegExp(path.resolve(node.path, "docs")),
      });

      extraArtifacts.push({
        message: `"${
          node.name
        }" (${breadcrumb}) has a "docs" folder which is not necessary for production usage ${humanFileSize(
          size
        )}.`,
        meta: {
          breadcrumb,
          name: node.name,
          directory: node.path,
          size,
        },
      });
    }

    if (fs.existsSync(path.resolve(node.path, "tests"))) {
      const size = getDirectorySize({
        directory: node.path,
        exclude: new RegExp(path.resolve(node.path, "tests")),
      });

      extraArtifacts.push({
        message: `"${
          node.name
        }" (${breadcrumb}) has a "tests" folder which is not necessary for production usage ${humanFileSize(
          size
        )}.`,
        meta: {
          breadcrumb,
          name: node.name,
          directory: node.path,
          size,
        },
      });
    }
  }

  return {
    id: "packagesWithExtraArtifacts",
    name: "Packages with extra artifacts",
    message: `There are currently ${
      new Set(extraArtifacts.map((action) => action.meta.name)).size
    } packages with artifacts that are superflous and are not necessary for production usage. ${humanFileSize(
      extraArtifacts.reduce((total, dep) => total + dep.meta.size, 0)
    )}`,
    actions: extraArtifacts.sort((a, b) => b.meta.size - a.meta.size),
  };
}

function topLevelDepsFreshness(dependencyTree, latestPackages) {
  const dependencies = Object.assign(
    {},
    Object.assign({}, dependencyTree.package.devDependencies || {}),
    dependencyTree.package.dependencies || {}
  );
  const totalDeps = Object.keys(dependencies).length;
  const outOfDate = { major: [], minor: [], patch: [] };

  for (const dependency in dependencies) {
    try {
      const topLevelPackagePath = "node_modules/" + dependency;
      const topLevelPackage = [...dependencyTree.inventory.values()].find(
        (dependency) => dependency.location === topLevelPackagePath
      );
      const breadcrumb = getBreadcrumb(topLevelPackage);
      const diff = semverDiff(
        topLevelPackage.version,
        latestPackages[topLevelPackage.name]
      );

      switch (diff) {
        case "major":
          outOfDate.major.push({
            name: dependency,
            dependency: `node_module/${dependency}`,
            version: topLevelPackage.version,
            breadcrumb,
          });
          break;
        case "minor":
          outOfDate.minor.push({
            name: dependency,
            dependency: `node_module/${dependency}`,
            version: topLevelPackage.version,
            breadcrumb,
          });
          break;
        case "patch":
          outOfDate.patch.push({
            name: dependency,
            dependency: `node_module/${dependency}`,
            version: topLevelPackage.version,
            breadcrumb,
          });
          break;
      }
    } catch (ex) {
      // TODO: better debugging messaging here
      console.log(ex);
    }
  }

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
      ...outOfDate.major.map(({ name, directory, version, breadcrumb }) => {
        return {
          message: `"${name}@${version}" is required as a direct dependency, the latest is ${latestPackages[name]}. This is a major version out of date.`,
          meta: {
            name,
            directory,
            breadcrumb,
          },
        };
      }),
      ...outOfDate.minor.map(({ name, directory, version, breadcrumb }) => {
        return {
          message: `"${name}@${version}" is required as a direct dependency, the latest is ${latestPackages[name]}. This is a minor version out of date.`,
          meta: {
            name,
            directory,
            breadcrumb,
          },
        };
      }),
      ...outOfDate.patch.map(({ name, directory, version, breadcrumb }) => {
        return {
          message: `"${name}@${version}" is required as a direct dependency, the latest is ${latestPackages[name]}. This is a patch version out of date.`,
          meta: {
            name,
            directory,
            breadcrumb,
          },
        };
      }),
    ],
  };
}

// What dependencies you are bringing in that don't absorb into the semver ranges at the top level
function notBeingAbsorbedByTopLevel(dependencyTree) {
  const notAbsorbed = [];

  for (const node of dependencyTree.inventory.values()) {
    const topLevelPath = `node_modules/${node.name}`;

    // don't count dependencies that are topLevel dependencies
    if (topLevelPath === node.path) continue;

    const topLevelPackage = dependencyTree.meta.data.packages[topLevelPath];

    // if there is no top level package there was no need to hoist it to deduplicate as there is only one package in the tree
    if (!topLevelPackage) continue;

    if (topLevelPackage && topLevelPackage.version !== node.version) {
      const breadcrumb = getBreadcrumb(node);
      const size = getDirectorySize({
        directory: node.path,
        exclude: new RegExp(path.resolve(node.path, "node_modules")),
      });

      notAbsorbed.push({
        message: `"${
          node.name
        }" (${breadcrumb}) not absorbed because top level dep is "${
          topLevelPackage.version
        }" and this is "${
          node.version
        }". This takes up an additional ${humanFileSize(size)}.`,
        meta: {
          breadcrumb,
          name: node.name,
          directory: node.path,
          size,
        },
      });
    }
  }

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
function nestedDependencyFreshness(dependencyTree, latestPackages) {
  const outOfDate = { major: [], minor: [], patch: [] };
  let totalDeps = 0;

  for (const node of dependencyTree.inventory.values()) {
    totalDeps += 1;

    try {
      const diff = semverDiff(node.version, latestPackages[node.name]);

      switch (diff) {
        case "major":
          outOfDate.major.push(node);
          break;
        case "minor":
          outOfDate.minor.push(node);
          break;
        case "patch":
          outOfDate.patch.push(node);
          break;
      }
    } catch (ex) {
      // TODO: better debugging messaging here
      console.log(ex);
    }
  }

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
      ...outOfDate.major.map((node) => {
        const { name, version, path } = node;
        const breadcrumb = getBreadcrumb(node);
        return {
          message: `"${name}@${version}" is required at "${breadcrumb}", the latest is ${latestPackages[name]}. This is a major version out of date.`,
          meta: {
            name,
            directory: path,
            breadcrumb,
          },
        };
      }),
      ...outOfDate.minor.map((node) => {
        const { name, version, path } = node;
        const breadcrumb = getBreadcrumb(node);
        return {
          message: `"${name}@${version}" is required at "${breadcrumb}", the latest is ${latestPackages[name]}. This is a minor version out of date.`,
          meta: {
            name,
            directory: path,
            breadcrumb,
          },
        };
      }),
      ...outOfDate.patch.map((node) => {
        const { name, version, path } = node;
        const breadcrumb = getBreadcrumb(node);
        return {
          message: `"${name}@${version}" is required at "${breadcrumb}", the latest is ${latestPackages[name]}. This is a patch version out of date.`,
          meta: {
            name,
            directory: path,
            breadcrumb,
          },
        };
      }),
    ],
  };
}

async function getLatestPackages(dependencyTree) {
  // TODO: this should be cached for faster build times and not having to make large requests to NPM
  const fakePackageJson = { dependencies: {} };

  const dependencyKeys = [...dependencyTree.inventory.entries()]
    .filter(([, node]) => {
      // ignore linked packages and packages that have realpaths that are on disk (which means they are linked and potentially don't exist in the registry)
      return !node.isLink && node.realpath.includes("node_modules");
    })
    .map(([, node]) => node.name);

  dependencyKeys.forEach((key) => {
    if (key.includes("fastlane")) return;
    fakePackageJson.dependencies[key] = "*";
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
  } catch ({ stdout, stderr }) {
    const packageData = JSON.parse(stdout.toString("utf8"));
    for (const packageName in packageData) {
      latestPackages[packageName] = packageData[packageName].latest;
    }
  }

  tmpobj.removeCallback();

  return latestPackages;
}

async function generateReport(dependencyTree) {
  const latestPackages = await getLatestPackages(dependencyTree);

  return {
    latestPackages,
    package: dependencyTree.package,
    dependencies: [...dependencyTree.inventory.entries()].map((arr) => {
      const dependencyInfo = arr[1];

      dependencyInfo.breadcrumb = getBreadcrumb(arr[1]);
      dependencyInfo.size = getDirectorySize({
        directory: dependencyInfo.path,
        exclude: new RegExp(path.resolve(dependencyInfo.path, "node_modules")),
      });
      dependencyInfo.packageInfo = JSON.parse(
        fs.readFileSync(
          path.resolve(dependencyInfo.path, "package.json"),
          "utf8"
        )
      );

      return [arr[0], dependencyInfo];
    }),
    suggestions: [
      packagesWithPinnedVersions(dependencyTree),
      packagesWithExtraArtifacts(dependencyTree),
      notBeingAbsorbedByTopLevel(dependencyTree),
      nestedDependencyFreshness(dependencyTree, latestPackages),
      topLevelDepsFreshness(dependencyTree, latestPackages),
    ],
  };
}

module.exports = {
  generateReport,
};
