#!/usr/bin/env node

const path = require("path");
const glob = require("tiny-glob");
const workerpool = require("workerpool");
const os = require("os");
// const chalk = require("chalk");
const yargs = require("yargs");
const ora = require("ora");
const debug = require("debug")("fulcrum");
const fs = require("fs");
const generate = require("../lib/generate");
const { contextualizeDependencyTree } = require("../lib/utils");

function getHrTimeInSeconds(hrtime) {
  const end = process.hrtime(hrtime);
  const seconds = (end[0] * 1e9 + end[1]) / 1e9;

  return `${seconds}s`;
}

const { argv } = yargs
  .usage("Figure out how your dependencies are affecting you.")
  .options({
    depth: {
      describe: "The depth to show console output",
      default: 20,
      type: "integer",
    },
    find: {
      describe:
        "Find particular node_modules to find and get an understanding of",
      type: "array",
    },
    report: {
      describe: "Generate html report",
      default: false,
      type: "boolean",
    },
    path: {
      describe: "The path to run fulcum against",
      default: process.cwd(),
      type: "string",
    },
    help: {
      describe: "Shows the help menu",
    },
  })
  .strict();

const maxWorkers = Math.ceil(os.cpus().length / 3);

const pool = workerpool.pool(
  path.resolve(__dirname, "..", "lib", "worker.js"),
  {
    maxWorkers,
    workerType: "thread",
  }
);

const start = process.hrtime();
const progress = ora("Identifying your node_modules").start();
const changeStatus = (text) =>
  (progress.text = `(${getHrTimeInSeconds(start)}) - ${text}`);

// Makes sure we have a path that looks like @foo/bar/node_modules/bar/node_modules or bar/node_modules/bar/node_modules
const validPathReg = new RegExp(
  "^node_modules/((@([A-Za-z-0-9-_.]*)/([A-Za-z-0-9-_.]*))|([A-Za-z-0-9-_.]*))(/node_modules/((@([A-Za-z-_.]*)/([A-Za-z-_.]*))|([A-Za-z-_.]*)))*/package.json"
);
const cwd = path.resolve(process.cwd(), argv.path);

const packages = [];

(async function main() {
  // We want to filter out any paths that don't makes sense like package.json's nested in test or dist dirs
  let paths = await glob("**/package.json", {
    cwd: cwd + "/node_modules",
    absolute: true,
  });

  paths = paths.filter((filePath) => {
    const match = validPathReg.exec(filePath.replace(cwd + "/", ""));

    debug(`Files Parsed: ${filePath}`);

    if (match) {
      if (argv.find) {
        return argv.find.find((val) => filePath.includes(val));
      }

      return true;
    }

    return false;
  });

  const allFilePromisesForAddon = paths.map((filePath) =>
    pool
      .exec("getDependencies", [filePath])
      .then((_package) => {
        if (!_package.name) return;

        changeStatus(`Identified ${_package.name}`);

        packages.push(_package);

        return;
      })
      .catch((ex) => {
        debug(`Error happening on ${filePath} \n ${ex.message}`);
      })
  );

  Promise.all(allFilePromisesForAddon).then(async () => {
    changeStatus("Generating output");

    try {
      const contextualTree = await contextualizeDependencyTree(packages, pool);

      if (argv.report) {
        const reportPath = path.resolve(cwd, "fulcrum", "index.html");

        await generate(contextualTree);

        changeStatus(`HTML Report was built to ${reportPath}`);
        progress.succeed();
      } else {
        const reportPath = path.resolve(cwd, "fulcrum", "report.json");

        try {
          fs.mkdirSync(reportPath, { recursive: true });
        } catch (ex) {
          debug(ex.message);
        }

        fs.writeFileSync(reportPath, JSON.stringify(contextualTree));

        changeStatus(`JSON Report was built to ${reportPath}`);
        progress.succeed();
      }
    } catch (ex) {
      changeStatus(`Failed with the following message - ${ex.message}`);
      progress.fail();
    }

    process.exit();
  });
})();
