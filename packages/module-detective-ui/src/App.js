import React from "react";
import {
  Switch,
  Route,
  Link as RouterLink,
  withRouter,
} from "react-router-dom";
import clsx from "clsx";
import makeStyles from "@mui/styles/makeStyles";
import withStyles from "@mui/styles/withStyles";

import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import DashboardIcon from "@mui/icons-material/Dashboard";
import Badge from "@mui/material/Badge";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";

import ModuleInfo from "./ModuleInfo";
import ModuleExplorerList from "./ModuleExplorerList";
import Dashboard from "./Dashboard";
import SuggestionModal from "./SuggestionModal";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  title: {
    flexGrow: 1,
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: "100vh",
    overflow: "auto",
    padding: theme.spacing(3),
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
  fixedHeight: {
    height: 240,
  },
  contentShift: {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  },
}));

const StyledBadge = withStyles((theme) => ({
  badge: {
    right: -3,
    top: 13,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: "0 4px",
  },
}))(Badge);

function App(props) {
  const classes = useStyles();
  const [report, setReport] = React.useState();

  React.useEffect(() => {
    fetch("./report.json")
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        console.log(data);
        setReport(data);
      })
      .catch((ex) => {
        console.log(ex);
      });
  }, []);

  if (!report) {
    return <div>Loading Report...</div>;
  }
  const { location } = props;

  const { suggestions } = report;
  const totalSuggestions = suggestions
    .map((suggestion) => suggestion.actions.length)
    .reduce((a, b) => a + b, 0);

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar
        position="absolute"
        className={clsx(classes.appBar, {
          [classes.appBarShift]: open,
        })}
      >
        <Toolbar className={classes.toolbar}>
          <Typography
            component="h1"
            variant="h6"
            color="inherit"
            noWrap
            className={classes.title}
          >
            <Link
              component={RouterLink}
              color="inherit"
              underline="none"
              to="/"
            >
              Module Detective
            </Link>
          </Typography>

          <Link
            component={RouterLink}
            to={{
              pathname: "/explorer",
              state: { modal: true },
            }}
          >
            <Tooltip title="Modules" aria-label="modules">
              <IconButton aria-label="modules" size="large">
                <AccountTreeIcon />
              </IconButton>
            </Tooltip>
          </Link>
          <Link component={RouterLink} to="/">
            <Tooltip title="Dashboard" aria-label="dashboard">
              <IconButton aria-label="dashboard" size="large">
                <StyledBadge badgeContent={totalSuggestions} color="secondary">
                  <DashboardIcon />
                </StyledBadge>
              </IconButton>
            </Tooltip>
          </Link>
        </Toolbar>
      </AppBar>
      <main className={classes.content}>
        <div className={classes.appBarSpacer} />
        <Container maxWidth="lg" className={classes.container}>
          <Switch location={location}>
            <Route exact={true} path="/">
              <Dashboard report={report} />
            </Route>
            <Route path="/dependencies/:id">
              <ModuleInfo report={report} />
            </Route>
          </Switch>
          <Route
            exact
            path="/suggestion/:id"
            render={() => <SuggestionModal report={report} />}
          />
          <Route
            exact
            path="/explorer"
            render={() => <ModuleExplorerList report={report} />}
          />

          <Box pt={4}>
            <Typography variant="body2" color="textSecondary" align="center">
              {"Copyright © "}
              <Link
                color="inherit"
                href="https://github.com/gabrielcsapo/module-detective"
              >
                Module Detective
              </Link>{" "}
              {new Date().getFullYear()}
              {"."}
            </Typography>
          </Box>
        </Container>
      </main>
    </div>
  );
}

export default withRouter(App);
