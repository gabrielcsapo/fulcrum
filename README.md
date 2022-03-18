# package-inspector

> Node module analytics tool to help figure out how your dependencies are affecting your project 🖲

## Installation

```
npm install package-inspector --save-dev
```

## Usage

```
See how your dependencies are affecting your project.

Options:
  --help       Shows the help menu                                 [boolean]
  --version    Show version number                                 [boolean]
  --report     Generate html report               [boolean] [default: false]
  --path       The path to run package-inspector against   [string] [default: cwd()]
  --outputDir  The path to output report to               [string] [default: cwd()/report]
```

### Getting Started

1. `npm install`

### Self Analysis

1. `cd packages/package-inspector`
2. `./bin/index.js --report`
   > This will create a `/report` directory with an `index.html` that contains the interactive html report. Optionally, a `DEV_SERVER` environment variable can be used to provide a served version of the html report.
   >
   > `DEV_SERVER=true ./bin/index.js --report` will create a live report at `http://localhost:8000/` which rebuilds with changes made in `package-inspector-ui`.
