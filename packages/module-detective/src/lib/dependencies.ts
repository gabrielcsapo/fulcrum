import tmp from "tmp";
import path from "path";
import debug from "debug";
import { exec } from "child_process";
import { copyFile, writeFile } from "fs/promises";

import { getBreadcrumb } from "./utils/breadcrumb";
import { getDirectorySize } from "./utils/disk";

import { IReport, IArboristNode, DependenciesList } from "../types";
import { IDependencyMap } from "package-json-type";
import {
  topLevelDepsFreshness,
  nestedDependencyFreshness,
  notBeingAbsorbedByTopLevel,
  packagesWithExtraArtifacts,
  packagesWithPinnedVersions,
} from "./suggestors";

debug("module-detective");

const Arborist = require("@npmcli/arborist");

function getValues(dependencyTree: IArboristNode) {
  // ignore the root node
  return [...dependencyTree.inventory.values()].filter(
    (node) => node.location !== ""
  );
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
  const dependencyTreeRoot: IArboristNode = await arb.loadActual();
  const latestPackages = await getLatestPackages(dependencyTreeRoot);

  const dependencies: DependenciesList = [];

  const dependencyValues = getValues(dependencyTreeRoot);
  dependencyValues.forEach((entryInfo) => {
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

  return {
    latestPackages,
    package: dependencyTreeRoot.package,
    dependencies,
    suggestions: [
      // suggestion because doesn't allow you to collapse versions (you end up with copies of what could be the same thing)
      packagesWithPinnedVersions(dependencyValues),

      // docs/ or tests/ is published to npm - how do you NOT publish them (use ignore file or package.json.files[]?
      packagesWithExtraArtifacts(dependencyValues),

      // version range that doesn't satisfy the top level version range
      notBeingAbsorbedByTopLevel(dependencyTreeRoot, dependencyValues),

      // your dependencies have updatable dependencies (and how out of date; major, minor, patch)
      nestedDependencyFreshness(dependencyValues, latestPackages),

      // name as nested, just top level
      topLevelDepsFreshness(
        dependencyTreeRoot,
        dependencyValues,
        latestPackages
      ),
    ],
  };
}
