import { IDependencyMap } from "package-json-type";
import { IArboristNode, ISuggestion, IVersionMeta, IAction } from "../../types";
import { getBreadcrumb } from "../utils/breadcrumb";
import semverDiff from "semver/functions/diff";

export default function topLevelDepsFreshness(
  root: IArboristNode,
  dependencyValues: IArboristNode[],
  latestPackages: IDependencyMap
): ISuggestion {
  const dependencies = Object.assign(
    {},
    Object.assign({}, root.package.devDependencies || {}),
    root.package.dependencies || {}
  );
  const totalDeps = Object.keys(dependencies).length;
  const outOfDate: {
    major: IVersionMeta[];
    minor: IVersionMeta[];
    patch: IVersionMeta[];
  } = { major: [], minor: [], patch: [] };

  for (const dependency in dependencies) {
    try {
      const topLevelPackage = dependencyValues.find(
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
