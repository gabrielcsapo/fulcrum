import * as React from "react";
import ReactDOM from "react-dom";
import { HashRouter as Router } from "react-router-dom";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, StyledEngineProvider } from "@mui/material/styles";

import App from "./App";
import theme from "./theme";

ReactDOM.render(
  <Router>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </Router>,
  document.querySelector("#root")
);
