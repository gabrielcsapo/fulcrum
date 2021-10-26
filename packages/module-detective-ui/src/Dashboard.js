import * as React from "react";
import Grid from "@material-ui/core/Grid";

import SuggestionCard from "./SuggestionCard";
import QuickInfo from "./QuickInfo";

export default function Dashboard() {
  const { suggestions } = report;

  return (
    <div>
      <QuickInfo />
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
