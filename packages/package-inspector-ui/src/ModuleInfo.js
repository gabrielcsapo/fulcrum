import React from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

function ModuleInfoHeader(props) {
  const { packageInfo = {} } = props;
  console.log(props);
  const homepageUrl = packageInfo?.homepage?.url;
  const fundingUrl = packageInfo?.funding?.url;

  return (
    <div>
      <h3>{packageInfo.name}</h3>
      <pre style={{ whiteSpace: "break-spaces" }}>
        {packageInfo.description}
      </pre>
      {homepageUrl && (
        <h4>
          Homepage: <a href={homepageUrl}>{homepageUrl}</a>
        </h4>
      )}
      {fundingUrl && (
        <h4>
          Funding: <a href={fundingUrl}>{fundingUrl}</a>
        </h4>
      )}
    </div>
  );
}

export default function ModuleInfo(props) {
  const { id } = useParams();
  const name = decodeURIComponent(id);

  const { dependencies, suggestions = [], latestPackages } = props.report || {};

  const versions = {};
  const locations = {};

  let topLevelPackageInfo = {};

  for (const [, dependencyInfo] of dependencies) {
    if (dependencyInfo.name === name) {
      const breadcrumb = dependencyInfo.breadcrumb;
      const version = dependencyInfo?.version;

      // verify we are at the top level module
      console.log(dependencyInfo.location, `node_modules/${name}`);
      if (dependencyInfo.location === `node_modules/${name}`) {
        topLevelPackageInfo = dependencyInfo;
      }

      if (version) {
        if (!versions[version]) {
          versions[version] = 0;
        }
        versions[version] += 1;
      }

      if (!locations[breadcrumb]) {
        locations[breadcrumb] = {
          version,
          actions: [],
        };
      }
    }
  }

  suggestions.forEach((suggestion) => {
    suggestion.actions.forEach((action) => {
      const parts = action.meta.breadcrumb.split("#");
      // we want to split the breadcrumb (foo#bar#@moo/bar)
      // if the last value is the name of the current module we are looking at
      // pick this and update the location object with the suggestion.
      if (
        (parts.length > 0 && parts[parts.length - 1] === name) ||
        parts[0] === name
      ) {
        if (!locations[action.meta.breadcrumb]) {
          locations[action.meta.breadcrumb] = {
            actions: [],
          };
        }
        locations[action.meta.breadcrumb].actions.push([suggestion, action]);
      }
    });
  });

  return (
    <div>
      <ModuleInfoHeader packageInfo={topLevelPackageInfo} />
      <h4>Latest: {latestPackages[name]}</h4>
      <div>
        <i>Versions: </i>
        {Object.keys(versions).map((version) => (
          <span key={version}>
            {version} ({versions[version]})
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
                  {locationPath.split("#").map((segment, j, arr) => {
                    if (j === arr.length - 1) {
                      return (
                        <Typography key={j}>
                          {segment}@{locations[locationPath].version}
                        </Typography>
                      );
                    }
                    return <Typography key={j}>{segment}</Typography>;
                  })}
                  {locations[locationPath] && (
                    <Avatar>{locations[locationPath]?.actions.length}</Avatar>
                  )}
                </Breadcrumbs>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {locations[locationPath]?.actions?.map(
                    ([suggestion, action], k) => {
                      return (
                        <ListItem divider={true} key={k}>
                          <ListItemText
                            primary={action.message}
                            secondary={`Suggestion Name: ${suggestion.name}`}
                          />
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
