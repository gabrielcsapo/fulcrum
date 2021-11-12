import tmp from "tmp";
import path from "path";
import fs from "fs";
import debug from "debug";
import { exec } from "child_process";
import semverDiff from "semver/functions/diff";
import { copyFile, writeFile } from "fs/promises";

import humanFileSize from "./utils/human-file-size";
import { getBreadcrumb } from "./utils/breadcrumb";
import { getDirectorySize } from "./utils/disk";

import {
  IAction,
  IVersionMeta,
  IReport,
  ISuggestion,
  IArboristNode,
  DependenciesList,
} from "../types";
import { IDependencyMap } from "package-json-type";

debug("module-detective");

const Arborist = require("@npmcli/arborist");

function getValues(dependencyTree: IArboristNode) {
  // ignore the root node
  return [...dependencyTree.inventory.values()].filter(
    (node) => node.location !== ""
  );
}

// TODO: the type of dependencyTree should come from npm/aborist
function packagesWithPinnedVersions(
  dependencyTree: IArboristNode
): ISuggestion {
  const packagedWithPinned = [];

  for (const node of getValues(dependencyTree)) {
    const breadcrumb = getBreadcrumb(node);

    const { dependencies } = node.package ?? {};
    for (const dependencyName in dependencies) {
      if (
        // might need to check the logic on this; "~" means "takes patches"
        // check node-semver to see the logc
        dependencies[dependencyName].substring(0, 1) === "~"
      ) {
        try {
          const size = getDirectorySize({
            directory: node.edgesOut.get(dependencyName)?.to.path ?? "",
            exclude: new RegExp(path.resolve(node.path, "docs")),
          });

          packagedWithPinned.push({
            message: `"${node.name}" (${breadcrumb}) has a pinned version for ${dependencyName}@${dependencies[dependencyName]} that will never collapse.`,
            meta: {
              breadcrumb,
              name: node.name,
              directory: node.path,
              size,
            },
          });
        } catch (ex: any) {
          console.log(ex.message);
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

function packagesWithExtraArtifacts(
  dependencyTree: IArboristNode
): ISuggestion {
  const extraArtifacts = [];

  for (const node of getValues(dependencyTree)) {
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

function topLevelDepsFreshness(
  dependencyTree: IArboristNode,
  latestPackages: IDependencyMap
): ISuggestion {
  const dependencies = Object.assign(
    {},
    Object.assign({}, dependencyTree.package.devDependencies || {}),
    dependencyTree.package.dependencies || {}
  );
  const totalDeps = Object.keys(dependencies).length;
  const outOfDate: {
    major: IVersionMeta[];
    minor: IVersionMeta[];
    patch: IVersionMeta[];
  } = { major: [], minor: [], patch: [] };

  for (const dependency in dependencies) {
    try {
      const topLevelPackage = [...getValues(dependencyTree)].find(
        (dependency) => dependency.location === `node_modules/${dependency}`
      );
      if (topLevelPackage) {
        const breadcrumb = getBreadcrumb(topLevelPackage);
        const diff = semverDiff(
          topLevelPackage.version,
          latestPackages[topLevelPackage.name]
        );

        switch (diff) {
          case "major":
            outOfDate.major.push({
              name: dependency,
              directory: `node_module/${dependency}`,
              version: topLevelPackage.version,
              breadcrumb,
            });
            break;
          case "minor":
            outOfDate.minor.push({
              name: dependency,
              directory: `node_module/${dependency}`,
              version: topLevelPackage.version,
              breadcrumb,
            });
            break;
          case "patch":
            outOfDate.patch.push({
              name: dependency,
              directory: `node_module/${dependency}`,
              version: topLevelPackage.version,
              breadcrumb,
            });
            break;
        }
      }
    } catch (ex) {
      // TODO: better debugging messaging here
      console.log(ex);
    }
  }

  const actions: IAction[] = [];

  outOfDate.major.forEach(({ name, directory, version, breadcrumb }) => {
    actions.push({
      message: `"${name}@${version}" is required as a direct dependency, the latest is ${latestPackages[name]}. This is a major version out of date.`,
      meta: {
        name,
        directory,
        breadcrumb,
      },
    });
  });

  outOfDate.minor.forEach(({ name, directory, version, breadcrumb }) => {
    actions.push({
      message: `"${name}@${version}" is required as a direct dependency, the latest is ${latestPackages[name]}. This is a minor version out of date.`,
      meta: {
        name,
        directory,
        breadcrumb,
      },
    });
  });

  outOfDate.patch.forEach(({ name, directory, version, breadcrumb }) => {
    actions.push({
      message: `"${name}@${version}" is required as a direct dependency, the latest is ${latestPackages[name]}. This is a patch version out of date.`,
      meta: {
        name,
        directory,
        breadcrumb,
      },
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
    actions,
  };
}

// What dependencies you are bringing in that don't absorb into the semver ranges at the top level
function notBeingAbsorbedByTopLevel(
  dependencyTree: IArboristNode
): ISuggestion {
  const notAbsorbed = [];

  for (const node of getValues(dependencyTree)) {
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
function nestedDependencyFreshness(
  dependencyTree: IArboristNode,
  latestPackages: IDependencyMap
): ISuggestion {
  const outOfDate: {
    major: IArboristNode[];
    minor: IArboristNode[];
    patch: IArboristNode[];
  } = {
    major: [],
    minor: [],
    patch: [],
  };
  let totalDeps = 0;

  for (const node of getValues(dependencyTree)) {
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
    } catch (ex: any) {
      console.log(ex.message);
    }
  }

  const actions: IAction[] = [];

  outOfDate.major.forEach((node) => {
    const { name, version, path } = node;
    const breadcrumb = getBreadcrumb(node);
    actions.push({
      message: `"${name}@${version}" is required at "${breadcrumb}", the latest is ${latestPackages[name]}. This is a major version out of date.`,
      meta: {
        name,
        directory: path,
        breadcrumb,
      },
    });
  });

  outOfDate.minor.map((node) => {
    const { name, version, path } = node;
    const breadcrumb = getBreadcrumb(node);
    actions.push({
      message: `"${name}@${version}" is required at "${breadcrumb}", the latest is ${latestPackages[name]}. This is a minor version out of date.`,
      meta: {
        name,
        directory: path,
        breadcrumb,
      },
    });
  });

  outOfDate.patch.map((node) => {
    const { name, version, path } = node;
    const breadcrumb = getBreadcrumb(node);
    actions.push({
      message: `"${name}@${version}" is required at "${breadcrumb}", the latest is ${latestPackages[name]}. This is a patch version out of date.`,
      meta: {
        name,
        directory: path,
        breadcrumb,
      },
    });
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
    actions,
  };
}

async function getLatestPackages(
  dependencyTree: IArboristNode
): Promise<IDependencyMap> {
  // TODO: this should be cached for faster build times and not having to make large requests to NPM
  const fakePackageJson: { dependencies: IDependencyMap } = {
    dependencies: {},
  };

  const dependencyKeys = getValues(dependencyTree)
    .filter((node) => {
      // ignore linked packages and packages that have realpaths that are on disk (which means they are linked and potentially don't exist in the registry)
      return !node.isLink && node.realpath.includes("node_modules");
    })
    .map((node) => node.name);

  dependencyKeys.forEach((key) => {
    if (key.includes("fastlane")) return;
    fakePackageJson.dependencies[key] = "*";
  });

  const tmpobj = tmp.dirSync({ unsafeCleanup: true });
  debug("Dir: " + tmpobj.name);

  await writeFile(
    path.resolve(tmpobj.name, "package.json"),
    JSON.stringify(fakePackageJson)
  );

  const latestPackages: IDependencyMap = {};
  try {
    // need to keep the registry context for the fake package.json so things get resolved correctly when checking outdated
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
  } catch (ex: any) {
    const packageData = JSON.parse(ex.stdout.toString("utf8"));
    for (const packageName in packageData) {
      latestPackages[packageName] = packageData[packageName].latest;
    }
  }

  tmpobj.removeCallback();

  return latestPackages;
}

export default async function generateReport(cwd: string): Promise<IReport> {
  const arb = new Arborist({});
  const dependencyTree: IArboristNode = await arb.loadActual();
  const latestPackages = await getLatestPackages(dependencyTree);

  const dependencies: DependenciesList = [];

  if (dependencyTree.inventory.size) {
    getValues(dependencyTree).forEach((entryInfo) => {
      const location = path
        .resolve(entryInfo.location)
        .replace(path.resolve(cwd) + "/", "");

      dependencies.push([
        location,
        {
          breadcrumb: getBreadcrumb(entryInfo),
          funding: entryInfo.funding,
          homepage: entryInfo.homepage,
          location,
          name: entryInfo.name,
          size: getDirectorySize({
            directory: entryInfo.path,
            exclude: new RegExp(path.resolve(entryInfo.path, "node_modules")),
          }),
        },
      ]);
    });
  }

  return {
    latestPackages,
    package: dependencyTree.package,
    dependencies,
    suggestions: [
      // suggestion because doesn't allow you to collapse versions (you end up with copies of what could be the same thing)
      packagesWithPinnedVersions(dependencyTree),

      // docs/ or tests/ is published to npm - how do you NOT publish them (use ignore file or package.json.files[]?
      packagesWithExtraArtifacts(dependencyTree),

      // version range that doesn't satisfy the top level version range
      notBeingAbsorbedByTopLevel(dependencyTree),

      // your dependencies have updatable dependencies (and how out of date; major, minor, patch)
      nestedDependencyFreshness(dependencyTree, latestPackages),

      // name as nested, just top level
      topLevelDepsFreshness(dependencyTree, latestPackages),
    ],
  };
}
