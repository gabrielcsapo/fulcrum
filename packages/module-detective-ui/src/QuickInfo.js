import * as React from "react";
import { Link as RouterLink } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Link from "@material-ui/core/Link";

import { humanFileSize } from "./utils";

const useStyles = makeStyles(() => ({
  root: {
    display: "flex",
  },
}));

function TopLevelDepCost() {
  const { package: _package, suggestions } = report;
  const costs = {};

  const topLevelDeps = [
    ...Object.keys(_package.devDependencies || {}),
    ...Object.keys(_package.dependencies || {}),
  ];

  suggestions.forEach((suggestion) => {
    suggestion.actions.forEach((action) => {
      const parts = action.meta.breadcrumb.split("#");

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
        suggestions are:
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
  const classes = useStyles();

  const { package: _package, dependencies, suggestions } = report;

  const topLevelDeps = Object.assign(
    {},
    Object.assign({}, _package.devDependencies || {}),
    _package.dependencies || {}
  );

  return (
    <Paper elevation={3} style={{ height: 300 }}>
      <Grid container className={classes.root} spacing={2}>
        <Grid item xs={6}>
          <Typography style={{ padding: 20 }}>
            The current project &lsquo;{_package.name}&lsquo; currently has{" "}
            {Object.keys(topLevelDeps).length.toLocaleString()} direct
            dependencies. As well as {dependencies.length.toLocaleString()}{" "}
            total sub dependencies. There are a total of{" "}
            {suggestions
              .map((suggestion) => suggestion.actions.length)
              .reduce((a, b) => a + b, 0)
              .toLocaleString()}{" "}
            suggestions. The size currently taken up by the dependenices is{" "}
            {humanFileSize(
              dependencies
                .map(([, dependencyInfo]) => dependencyInfo.size)
                .reduce((a, b) => a + b, 0)
            )}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <TopLevelDepCost />
        </Grid>
      </Grid>
    </Paper>
  );
}
