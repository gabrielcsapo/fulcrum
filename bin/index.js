#!/usr/bin/env node

const path = require("path");
const yargs = require("yargs");
const ora = require("ora");
const debug = require("debug")("module-detective");
const fs = require("fs");
const Arborist = require("@npmcli/arborist");

const Report = require("../lib/report");
const { generateReport } = require("../lib/dependencies");

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

const start = process.hrtime();
const progress = ora("Identifying your node_modules").start();
const changeStatus = (text) =>
  (progress.text = `(${getHrTimeInSeconds(start)}) - ${text}`);

const cwd = path.resolve(process.cwd(), argv.path);

(async function main() {
  const arb = new Arborist({});

  try {
    const dependencyTree = await arb.loadActual();
    const report = await generateReport(dependencyTree);

    if (argv.report) {
      const reportPath = path.resolve(cwd, "report", "index.html");

      if (process.env.DEV_FULCRUM) {
        changeStatus(`Dev server starting`);
        progress.succeed();
      }

      await Report(report);

      if (!process.env.DEV_FULCRUM) {
        changeStatus(`HTML Report was built to ${reportPath}`);
        progress.succeed();
      }
    } else {
      const reportPath = path.resolve(cwd, "report", "report.json");

      try {
        fs.mkdirSync(reportPath, { recursive: true });
      } catch (ex) {
        debug(ex.message);
      }

      fs.writeFileSync(reportPath, JSON.stringify(report));

      changeStatus(`JSON Report was built to ${reportPath}`);
      progress.succeed();
    }
  } catch (ex) {
    changeStatus(
      `Failed with the following message - \n ${ex.stack.toString("utf8")}`
    );
    progress.fail();
  }

  process.exit();
})();
