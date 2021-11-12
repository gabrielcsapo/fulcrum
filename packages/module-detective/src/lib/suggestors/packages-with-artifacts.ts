import fs from "fs";
import path from "path";
import { IArboristNode, ISuggestion } from "../../types";
import { getBreadcrumb } from "../utils/breadcrumb";
import { getDirectorySize } from "../utils/disk";
import humanFileSize from "../utils/human-file-size";

export default function packagesWithExtraArtifacts(
  dependencyValues: IArboristNode[]
): ISuggestion {
  const extraArtifacts = [];

  for (const node of dependencyValues) {
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