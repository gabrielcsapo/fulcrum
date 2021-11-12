import fs from "fs";
import path from "path";

export function getAllFiles(
  dirPath: string,
  exclude: RegExp,
  arrayOfFiles?: string[]
) {
  const files = fs.readdirSync(dirPath);

  const _arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file: string) {
    const fullPath = path.join(dirPath, file);

    try {
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, exclude, arrayOfFiles);
      } else {
        if (!exclude || (exclude && !exclude.test(fullPath))) {
          _arrayOfFiles.push(fullPath);
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
  exclude: RegExp;
}) {
  const arrayOfFiles = getAllFiles(directory, exclude);

  return arrayOfFiles
    .map((filePath) => fs.statSync(filePath).size)
    .reduce((a, b) => a + b, 0);
}
