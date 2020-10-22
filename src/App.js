import React, { Component } from "react";
import {
  Switch,
  Route,
  Link as RouterLink,
  useParams,
  useHistory,
  withRouter,
} from "react-router-dom";
import clsx from "clsx";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import CssBaseline from "@material-ui/core/CssBaseline";
import Box from "@material-ui/core/Box";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import DashboardIcon from "@material-ui/icons/Dashboard";
import Badge from "@material-ui/core/Badge";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Link from "@material-ui/core/Link";
import AccountTreeIcon from "@material-ui/icons/AccountTree";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";

import ModuleInfo from "./ModuleInfo";
import ModuleExplorerList from "./ModuleExplorerList";
import Dashboard from "./Dashboard";

const styles = (theme) => ({
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
});

const StyledBadge = withStyles((theme) => ({
  badge: {
    right: -3,
    top: 13,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: "0 4px",
  },
}))(Badge);

class App extends Component {
  constructor(props) {
    super(props);
    this.previousLocation = this.props.location;
  }

  componentWillUpdate() {
    const { location } = this.props;
    if (!(location.state && location.state.modal)) {
      this.previousLocation = this.props.location;
    }
  }

  render() {
    const { classes, location } = this.props;
    const isModal =
      location.state &&
      location.state.modal &&
      this.previousLocation !== location;

    // eslint-disable-next-line no-undef
    const { suggestions, dependencies } = report;
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
              Fulcrum
            </Typography>

            <Link
              component={RouterLink}
              to={{
                pathname: "/explorer",
                state: { modal: true },
              }}
            >
              <Tooltip title="Modules" aria-label="modules">
                <IconButton aria-label="modules">
                  <AccountTreeIcon />
                </IconButton>
              </Tooltip>
            </Link>
            <Link component={RouterLink} to="/">
              <Tooltip title="Dashboard" aria-label="dashboard">
                <IconButton aria-label="dashboard">
                  <StyledBadge
                    badgeContent={totalSuggestions}
                    color="secondary"
                  >
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
            <Switch location={isModal ? this.previousLocation : location}>
              <Route exact={true} path="/">
                <Dashboard />
              </Route>
              <Route path="/dependencies/:id">
                <ModuleInfo />
              </Route>
            </Switch>
            <Route
              exact
              path="/explorer"
              render={() => <ModuleExplorerList />}
            />

            <Box pt={4}>
              <Typography variant="body2" color="textSecondary" align="center">
                {"Copyright © "}
                <Link
                  color="inherit"
                  href="https://github.com/gabrielcsapo/fulcrum"
                >
                  Fulcrum
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
}

export default withStyles(styles, { withTheme: true })(withRouter(App));
