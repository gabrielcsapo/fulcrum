/* eslint-disable no-undef */
import * as React from "react";
import { Link as RouterLink, useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Link from "@material-ui/core/Link";
import { ResponsivePie } from "@nivo/pie";

import { walkTree, humanFileSize } from "../lib/utils";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
}));

function TopLevelDepCost() {
  // eslint-disable-next-line no-undef
  const { package: _package, suggestions } = report;
  const costs = {};

  const topLevelDeps = [
    ...Object.keys(_package.devDependencies || {}),
    ...Object.keys(_package.dependencies || {}),
  ];

  suggestions.forEach((suggestion) => {
    suggestion.actions.forEach((action) => {
      const parts = action.meta.path.split("#");

      if (parts.length > 0) {
        if (!costs[parts[0]]) {
          costs[parts[0]] = [];
        }
        costs[parts[0]].push({
          suggestion: suggestion.id,
          action,
        });
      }
    });
  });

  const topLevelCosts = Object.keys(costs)
    .sort((a, b) => costs[b].length - costs[a].length)
    .slice(0, 5);

  return (
    <div>
      <Typography variant="body1" component="p" style={{ paddingTop: 20 }}>
        Out of the {Object.keys(topLevelDeps).length} top level dependencies.
        The top {topLevelCosts.length.toLocaleString()} with the most
        suggestions are;
      </Typography>
      <ul>
        {topLevelCosts.map((dep, i) => {
          return (
            <li key={i}>
              <Link
                component={RouterLink}
                to={`/dependencies/${encodeURIComponent(dep)}`}
              >
                {dep}
              </Link>{" "}
              with {costs[dep].length.toLocaleString()} suggestions
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function QuickInfo() {
  const history = useHistory();
  const classes = useStyles();

  console.log(report);

  const { package: _package, dependencies, suggestions } = report;

  const topLevelDepsByCost = {};

  const topLevelDeps = Object.assign(
    {},
    Object.assign({}, _package.devDependencies || {}),
    _package.dependencies || {}
  );

  // walkTree(dependencies, (dependency) => {
  //   Object.keys(topLevelDeps).forEach((_dependency) => {
  //     if (
  //       _dependency === dependency.name &&
  //       isNestedNodeModules(dependency.directory) === 1
  //     ) {
  //       if (!topLevelDepsByCost[_dependency]) {
  //         topLevelDepsByCost[_dependency] = {
  //           id: _dependency,
  //           name: _dependency,
  //           value: 0,
  //         };
  //       }

  //       walkDependencies(dependency, (dep) => {
  //         topLevelDepsByCost[_dependency].value += dep.size;
  //       });
  //     }
  //   });
  // });

  return (
    <Paper elevation={3} style={{ height: 300 }}>
      <Grid container className={classes.root} spacing={2}>
        <Grid item xs={3} style={{ height: 300 }}>
          <ResponsivePie
            data={Object.keys(topLevelDepsByCost).map(
              (name) => topLevelDepsByCost[name]
            )}
            sortByValue={true}
            margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            colors={{ scheme: "nivo" }}
            borderWidth={1}
            borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
            enableRadialLabels={false}
            radialLabelsSkipAngle={10}
            radialLabelsTextXOffset={6}
            radialLabelsTextColor="#333333"
            radialLabelsLinkOffset={0}
            radialLabelsLinkDiagonalLength={16}
            radialLabelsLinkHorizontalLength={24}
            radialLabelsLinkStrokeWidth={1}
            radialLabelsLinkColor={{ from: "color" }}
            enableSlicesLabels={false}
            slicesLabelsSkipAngle={10}
            slicesLabelsTextColor="#333333"
            animate={true}
            motionStiffness={90}
            motionDamping={15}
            onClick={function (e) {
              console.log(e);
              history.push(`/dependencies/${encodeURIComponent(e.name)}`);
            }}
            tooltip={function (e) {
              return e.id + " (" + humanFileSize(e.value) + ")";
            }}
          />
        </Grid>
        <Grid item xs={4}>
          <Typography style={{ padding: 20 }}>
            The current project currently has{" "}
            {Object.keys(topLevelDepsByCost).length.toLocaleString()}{" "}
            dependencies. As well as{" "}
            {suggestions
              .map((suggestion) => suggestion.actions.length)
              .reduce((a, b) => a + b, 0)
              .toLocaleString()}{" "}
            suggestions. The size currently taken up by the dependenices is{" "}
            {humanFileSize(
              Object.keys(topLevelDepsByCost)
                .map((name) => topLevelDepsByCost[name].value)
                .reduce((a, b) => a + b, 0)
            )}
          </Typography>
        </Grid>
        <Grid item xs={5}>
          <TopLevelDepCost />
        </Grid>
      </Grid>
    </Paper>
  );
}
