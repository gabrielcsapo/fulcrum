const workerpool = require("workerpool");
const fs = require("fs");
const path = require("path");

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

function getDependencies(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const { name, version, dependencies = {} } = require(filePath);

      if (!name) {
        return resolve({});
      }

      const directory = path.dirname(filePath);
      const stat = fs.lstatSync(directory);

      // we want to ignore the node_modules size as this is captured by recursively looking at the descendants of a given node.
      const size = getDirectorySize({
        directory,
        exclude: new RegExp(path.resolve(directory, "node_modules")),
      });

      return resolve({
        name,
        version,
        dependencies,
        size,
        isSymbolicLink: stat.isSymbolicLink(),
        directory: directory.replace(process.cwd() + "/", ""),
      });
    } catch (ex) {
      return reject(ex);
    }
  });
}

workerpool.worker({
  getDependencies,
});
