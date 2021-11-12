import { IDependencyMap } from "package-json-type";
import semverDiff from "semver/functions/diff";
import { ISuggestion, IAction, IArboristNode } from "../../types";
import { getBreadcrumb } from "../utils/breadcrumb";

// What percentage of your nested dependencies do you bring in that are out of date (major, minor, patch)
export function nestedDependencyFreshness(
  dependencyValues: IArboristNode[],
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

  for (const node of dependencyValues) {
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
      console.log(ex);
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
