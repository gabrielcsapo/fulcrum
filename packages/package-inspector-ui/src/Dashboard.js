import * as React from "react";
import Grid from "@mui/material/Grid";

import SuggestionCard from "./SuggestionCard";
import QuickInfo from "./QuickInfo";

export default function Dashboard(props) {
  const { suggestions } = props.report;

  return (
    <div>
      <QuickInfo report={props.report} />
      <br />
      <Grid container spacing={3} justifyContent="center" alignItems="stretch">
        {suggestions.map((suggestion, index) => {
          return (
            <Grid item xs={3} sm={3} key={index}>
              <SuggestionCard suggestion={suggestion} />
            </Grid>
          );
        })}
      </Grid>
    </div>
  );
}
