import path from "path";
import { ISuggestion, ISuggestionInput } from "../../types";
import { getBreadcrumb } from "../utils/breadcrumb";
import { getDirectorySize } from "../utils/disk";
import humanFileSize from "../utils/human-file-size";

/**
 * What dependencies you are bringing in that don't absorb into
 * the semver ranges at the top level
 * version range that doesn't satisfy the top level version range
 */
export default function notBeingAbsorbedByTopLevel({
  rootArboristNode,
  arboristValues,
}: ISuggestionInput): Promise<ISuggestion> {
  const notAbsorbed = [];

  for (const node of arboristValues) {
    const topLevelPath = `node_modules/${node.name}`;

    // don't count dependencies that are topLevel dependencies
    if (topLevelPath === node.path) continue;

    const topLevelPackage = rootArboristNode?.meta.data.packages[topLevelPath];

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

  return Promise.resolve({
    id: "notBeingAbsorbedByTopLevel",
    name: "Dependencies not being absorbed",
    message: `There are currently ${
      notAbsorbed.length
    } duplicate packages being installed on disk because they are not being absorbed into the top level semver range. This equates to a total of ${humanFileSize(
      notAbsorbed.reduce((total, dep) => total + dep.meta.size, 0)
    )}`,
    actions: notAbsorbed.sort((a, b) => b.meta.size - a.meta.size),
  });
}
