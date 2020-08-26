#!/usr/bin/env node

const path = require('path');
const walkSync = require('walk-sync');
const workerpool = require('workerpool');
const os = require('os');
const chalk = require('chalk');
const yargs = require('yargs');
const ora = require('ora');
const { humanFileSize } = require('../utils');

function getHrTimeInSeconds(hrtime) {
  const end = process.hrtime(start);
  const seconds = ((end[0] * 1e9) + end[1]) / 1e9;

  return `${seconds}s`;
}

const { argv } = yargs
  .usage('Figure out how your dependencies are affecting you.')
  .options({
    depth: {
      describe:
        'The depth to show console output',
      default: 20,
      type: 'integer',
    },
    find: {
      describe: 'Find particular node_modules to find and get an understanding of',
      type: 'array'
    },
    path: {
      describe: 'The path to run fulcum against',
      default: process.cwd(),
      type: 'string',
    },
    help: {
      describe: 'Shows the help menu',
    }
  })
  .strict();

const maxWorkers = Math.ceil(os.cpus().length / 3);

const pool = workerpool.pool(path.resolve(__dirname, '..', 'worker.js'), {
  maxWorkers,
  workerType: 'thread',
});

const progress = ora(
  'Identifying your node_modules'
).start();

const validPathReg = new RegExp('^node_modules\/((@([A-Za-z-0-9]*)\/([A-Za-z-0-9]*))|([A-Za-z-0-9]*))(\/node_modules\/((@([A-Za-z-]*)\/([A-Za-z-]*))|([A-Za-z]*)))*\/package\.json');

const cwd = path.resolve(process.cwd(), argv.path);
// We want to filter out any paths that don't makes sense like package.json's nested in test or dist dirs
const paths = walkSync(cwd + '/node_modules', { directories: false, includeBasePath: true, globs: ['**/package.json'] }).filter((filePath) => {
  if (argv.find && argv.find.find((val) => filePath.includes(val))) {
    return true;
  } else {
    return false;
  }

  const match = validPathReg.exec(filePath.replace(cwd + '/', ''));

  // TODO: put this behind a debug flag it could be useful
  // if(!match) {
  //   console.log(filePath)
  // }

  return !!match;
});

const start = process.hrtime();

const packages = [];

const allFilePromisesForAddon = paths.map((filePath) =>
    pool.exec('getDependencies', [filePath]).then((package) => {
        if(!package.name) return;

        progress.text = `(${getHrTimeInSeconds(start)}) - Identified ${package.name}`;

        packages.push(package);

        return;
    }).catch((ex) => {
        console.log(`error happening on ${filePath} \n ${ex.message}`);
    })
);

Promise.all(allFilePromisesForAddon).then(() => {
    progress.stop();

    const totalSize = packages.map(({ name, version, dependencies, size }) => size).reduce((a, b) => a + b, 0);
    const largestPackages = packages.sort((a, b) => b.size - a.size).slice(0, argv.depth);
    const largestDuplicatesMap = {};
    packages.forEach(({ name, version, size, isSymbolicLink, directory }) => {
      if (!largestDuplicatesMap[name]) {
        largestDuplicatesMap[name] = {
          versions: [],
          size: 0
        }
      }

      // we don't want to count the size if it is symbolic
      if(!isSymbolicLink) {
        largestDuplicatesMap[name].size += size;
      }
      largestDuplicatesMap[name].versions.push({ version, directory, size });
    });
  
    const largestDuplicate = Object.keys(largestDuplicatesMap).map((key) => {
      return { name: key, ...largestDuplicatesMap[key] }
    });
  
    console.log(`${chalk.bold('Completed in')}: ${getHrTimeInSeconds(start)}`);
    console.log('');
    console.log(`${chalk.bold('node_modules size')}: ${humanFileSize(totalSize)}`);
    console.log('');
    console.log(chalk.bold(`Largest packages:`))
    largestPackages.forEach(({ name, isSymbolicLink, version, directory, size }) => {
      console.log(`   ${name}:${version} ${isSymbolicLink ? '(this is symbolic)' : ''} (${humanFileSize(size)}) ${directory}`)
    });
    console.log('');
    console.log(chalk.bold('Most Duplicated Dependencies:'))
    largestDuplicate.sort((a, b) => b.versions.length - a.versions.length).slice(0, argv.depth).forEach(({ name, versions, size}) => {
      const uniqueVersions = [...new Set(versions.map(({ version }) => version))];

      console.log(`   ${name} (versions ${versions.length}) (${uniqueVersions.join(',')}) ${humanFileSize(size)}`);
    });
    console.log('');
    console.log(chalk.bold('Largest dependency:'));
    largestDuplicate.sort((a, b) => b.size - a.size).slice(0, argv.depth).forEach(({ name, versions, size}) => {
      console.log(`   ${name} (versions ${versions.length}) ${humanFileSize(size)}`);
    });

    process.exit();
});