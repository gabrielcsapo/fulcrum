import React from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs from "@material-ui/core/Breadcrumbs";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Accordion from "@material-ui/core/Accordion";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Badge from "@material-ui/core/Badge";

import { walkTree } from "../lib/utils";
import { ReportOffSharp } from "@material-ui/icons";

function isNestedNodeModules(directory) {
  const re = /(node_modules)/g;
  return ((directory || "").match(re) || []).length > 1;
}

function findNestedPackage(obj, packageName, path) {
  obj.alreadyFound = true;

  if (!path) {
    path = obj.directory;
  }

  let found = [];

  for (const nestedPackageName in obj.dependencies) {
    if (nestedPackageName === packageName) {
      found.push({
        fullLocation: path + "/node_modules/" + packageName,
        dependency: obj.dependencies[nestedPackageName],
      });
    }

    if (obj.dependencies[nestedPackageName].dependencies) {
      if (obj.dependencies[nestedPackageName].alreadyFound) continue;

      found = [
        ...found,
        ...findNestedPackage(
          obj.dependencies[nestedPackageName],
          packageName,
          path + "/node_modules/" + nestedPackageName
        ),
      ];
    }
  }

  return found;
}

function decorateTopLevelDependencies(obj, dependencies, path) {
  if (!path) {
    path = obj.directory;
  }

  for (const nestedPackageName in obj.dependencies) {
    let nestedPackage = obj.dependencies[nestedPackageName];
    if (!isNestedNodeModules(nestedPackage.directory)) {
      if (obj.dependencies[nestedPackageName].alreadyDecorated) return;

      obj.dependencies[nestedPackageName] = dependencies.find(
        (d) => d.name === nestedPackage.name
      );
      obj.dependencies[nestedPackageName].alreadyDecorated = true;
    }

    if (nestedPackage.dependencies) {
      decorateTopLevelDependencies(
        obj.dependencies[nestedPackageName],
        dependencies,
        path + "/node_modules/" + nestedPackage.name
      );
    }
  }

  return;
}

export default function ModuleInfo() {
  let { id } = useParams();

  const { package: _package, suggestions } = report;

  const name = decodeURIComponent(id);

  const versions = [];

  const locations = {};

  suggestions.forEach((suggestion) => {
    suggestion.actions.forEach((action) => {
      const parts = action.meta.path.split("#");

      if (parts.length > 0 && parts[0] === name) {
        if (!locations[action.meta.path]) {
          locations[action.meta.path] = [];
        }

        locations[action.meta.path].push(action);
      }
    });
  });

  return (
    <div>
      <h3>{name}</h3>
      <div>
        {Object.keys({}).map((version) => (
          <span key={version}>
            {version} ({0})
          </span>
        ))}
      </div>
      <br />
      {Object.keys(locations)
        .sort()
        .map((locationPath, i) => {
          return (
            <Accordion key={i}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Breadcrumbs aria-label="breadcrumb" key={i}>
                  {locationPath.split("#").map((segment, j, array) => {
                    return <Typography key={j}>{segment}</Typography>;
                  })}
                  {locations[locationPath] && (
                    <Avatar>{locations[locationPath].length}</Avatar>
                  )}
                </Breadcrumbs>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {locations[locationPath] &&
                    locations[locationPath].map((suggestion, k) => {
                      return (
                        <ListItem divider={true} key={k}>
                          <ListItemText primary={suggestion.message} />
                        </ListItem>
                      );
                    })}
                </List>
              </AccordionDetails>
            </Accordion>
          );
        })}
    </div>
  );
}
