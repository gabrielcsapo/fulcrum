#!/usr/bin/env node

import path from "path";
import fs from "fs";
import debug from "debug";
import ora from "ora";
import yargs from "yargs";

const Report = require("../lib/report");
const { generateReport } = require("../lib/dependencies");

function getHrTimeInSeconds(hrtime: [number, number]) {
  const end = process.hrtime(hrtime);
  const seconds = (end[0] * 1e9 + end[1]) / 1e9;

  return `${seconds}s`;
}

const { argv } = yargs
  .usage("See how your dependencies are affecting your project.")
  .options({
    report: {
      describe: "Generate html report",
      default: false,
      type: "boolean",
    },
    path: {
      describe: "The path to run module-detective against",
      default: process.cwd(),
      type: "string",
    },
    outputDir: {
      describe: "The path to output report to",
      default: path.resolve(process.cwd(), "report"),
      type: "string",
    },
    help: {
      describe: "Shows the help menu",
    },
  })
  .strict();

const start = process.hrtime();
const progress = ora("Identifying your node_modules").start();
const changeStatus = (text: string) =>
  (progress.text = `(${getHrTimeInSeconds(start)}) - ${text}`);

const cwd = path.resolve(process.cwd(), argv.path);
const outputDir = path.resolve(argv.outputDir);

(async function main() {
  try {
    const report = await generateReport(cwd);

    if (argv.report) {
      const reportPath = path.resolve(outputDir, "index.html");

      if (process.env.DEV_SERVER) {
        changeStatus(`Dev server starting`);
        progress.succeed();
      }

      await Report(report, { outputDir });

      if (!process.env.DEV_SERVER) {
        changeStatus(`HTML Report was built to ${reportPath}`);
        progress.succeed();
      }
    } else {
      const reportPath = path.resolve(outputDir, "report.json");

      try {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      } catch (ex: any) {
        debug(ex.message);
      }

      fs.writeFileSync(reportPath, JSON.stringify(report));

      changeStatus(`JSON Report was built to ${reportPath}`);
      progress.succeed();
    }
  } catch (error: any) {
    changeStatus(
      `Failed with the following message - \n ${error.stack.toString("utf8")}`
    );
    progress.fail();
  }

  process.exit();
})();
