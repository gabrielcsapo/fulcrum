import fs from "fs";
import path from "path";

export function getAllFiles(
  dirPath: string,
  exclude?: RegExp,
  arrayOfFiles?: string[]
) {
  const files = fs.readdirSync(dirPath);

  const _arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file: string) {
    const fullPath = path.join(dirPath, file);

    try {
      if (
        fs.statSync(fullPath).isDirectory() &&
        (!exclude || (exclude && !exclude.test(fullPath)))
      ) {
        try {
          _arrayOfFiles.push(...getAllFiles(fullPath, exclude));
        } catch (ex: any) {
          console.log(ex.message);
        }
      } else {
        if (!exclude || (exclude && !exclude.test(fullPath))) {
          _arrayOfFiles.push(fullPath);
        } else {
          console.log("excluding", fullPath, " for ", dirPath, exclude);
        }
      }
    } catch (ex: any) {
      console.log(ex.message);
    }
  });

  return _arrayOfFiles;
}

export function getDirectorySize({
  directory,
  exclude,
}: {
  directory: string;
  exclude?: RegExp;
}) {
  const arrayOfFiles = getAllFiles(directory, exclude);

  const size = arrayOfFiles
    .map((filePath) => fs.statSync(filePath).size)
    .reduce((a, b) => a + b, 0);

  return size;
}
