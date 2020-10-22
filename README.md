# fulcrum

## Installation

```
npm install fulcrum
```

## Usage

```
Figure out how your dependencies are affecting you.

Options:
  --help     Shows the help menu                                       [boolean]
  --version  Show version number                                       [boolean]
  --depth    The depth to show console output                      [default: 20]
  --find     Find particular node_modules to find and get an understanding of
                                                                         [array]
  --report   Generate html report                     [boolean] [default: false]
  --path     The path to run fulcum against
                           [string] [default: "/Users/gcsapo/Documents/fulcrum"]
```

- be able to show funding infromation for certain node_modules
- call out pin versions as this will not let you collapse (not great)
- look at `yarn why` output format to show (produce json and the console output)
  - you will save "xmb" per action that is being produced
  - be able to distinguish devDeps and deps (in the top level application you are running against)
  - some legit use cases for using something as a dep and devDep
- look for published packages deploying test directories
- move to https://github.com/npm/arborist
