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

  const { topLevelPackage, suggestions, dependencies } = report;

  const name = decodeURIComponent(id);

  const topLevelDependencies = {
    ...topLevelPackage.dependencies,
    ...topLevelPackage.devDependencies,
  };

  const versions = [];

  walkTree(dependencies, (dep) => {
    if (dep.name === name) {
      versions.push(dep.version);
    }
  });

  let locations = [];
  const topLevelDependenciesDecorated = {};

  Object.keys(topLevelDependencies).forEach((packageName) => {
    topLevelDependenciesDecorated[packageName] = dependencies.find(
      (d) => d.name === packageName
    );
    decorateTopLevelDependencies(
      topLevelDependenciesDecorated[packageName],
      dependencies
    );
    locations = [
      ...locations,
      ...findNestedPackage(topLevelDependenciesDecorated[packageName], name),
    ];
  });

  const locationsWithSuggestions = {};

  locations.forEach(({ fullLocation, dependency }) => {
    suggestions.forEach((suggestion) => {
      suggestion.actions.forEach((action) => {
        if (action.meta.directory === dependency.directory) {
          if (!locationsWithSuggestions[fullLocation]) {
            locationsWithSuggestions[fullLocation] = [];
          }
          locationsWithSuggestions[fullLocation].push(action);
        }
      });
    });
  });

  function getLocationSegments(location) {
    return location
      .split("node_modules/")
      .filter((segment) => segment !== "")
      .map((segment) => {
        if (segment.substr(segment.length - 1) === "/") {
          return segment.substr(0, segment.length - 1);
        }
        return segment;
      });
  }

  const countOfVersions = {};
  versions.forEach((version) => {
    if (!countOfVersions[version]) {
      countOfVersions[version] = 0;
    }
    countOfVersions[version] += 1;
  });

  return (
    <div>
      <h3>{name}</h3>
      <div>
        {Object.keys(countOfVersions).map((version) => (
          <span key={version}>
            {version} ({countOfVersions[version]})
          </span>
        ))}
      </div>
      <br />
      {locations.sort().map(({ fullLocation }, i) => {
        return (
          <Accordion key={i}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Breadcrumbs aria-label="breadcrumb" key={i}>
                {getLocationSegments(fullLocation).map((segment, j, array) => {
                  return <Typography key={j}>{segment}</Typography>;
                })}
                {locationsWithSuggestions[fullLocation] && (
                  <Avatar>
                    {locationsWithSuggestions[fullLocation].length}
                  </Avatar>
                )}
              </Breadcrumbs>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {locationsWithSuggestions[fullLocation] &&
                  locationsWithSuggestions[fullLocation].map(
                    (suggestion, k) => {
                      return (
                        <ListItem divider={true} key={k}>
                          <ListItemText primary={suggestion.message} />
                        </ListItem>
                      );
                    }
                  )}
              </List>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </div>
  );
}
