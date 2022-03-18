import * as React from "react";
import { Link as RouterLink, useHistory } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import makeStyles from "@mui/styles/makeStyles";
import Modal from "@mui/material/Modal";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import SearchIcon from "@mui/icons-material/Search";
import InputBase from "@mui/material/InputBase";

import { FixedSizeList } from "react-window";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  paper: {
    position: "absolute",
    width: 400,
    backgroundColor: theme.palette.background.paper,
    border: "2px solid #000",
    boxShadow: theme.shadows[5],
  },
  search: {
    display: "flex",
    marginTop: theme.spacing(1),
    alignContent: "center",
    alignItems: "center",
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(3),
      width: "auto",
    },
  },
  searchIcon: {
    padding: theme.spacing(0, 1),
    height: "100%",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inputRoot: {
    color: "inherit",
  },
  inputInput: {
    padding: theme.spacing(2),
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "20ch",
    },
  },
}));

function getModalStyle() {
  const top = 50;
  const left = 50;

  return {
    top: `${top}%`,
    left: `${left}%`,
    transform: `translate(-${top}%, -${left}%)`,
  };
}

function renderRow(props) {
  const { index, data, style } = props;
  const { packageName, count } = data[index];

  return (
    <Link
      component={RouterLink}
      to={`/dependencies/${encodeURIComponent(packageName)}`}
    >
      <ListItem button style={style} key={index}>
        <ListItemAvatar>
          <Avatar>{count.toLocaleString()}</Avatar>
        </ListItemAvatar>
        <ListItemText primary={packageName} />
        <Divider />
      </ListItem>
    </Link>
  );
}

export default function ModuleExplorerList(props) {
  const history = useHistory();
  const classes = useStyles();
  const [modalStyle] = React.useState(getModalStyle);

  const [searchTerm, setSearchTerm] = React.useState("");

  const { suggestions = [] } = props.report || {};

  const suggestionsGroupedByPackageMap = {};

  suggestions.forEach((suggestion) => {
    suggestion.actions.forEach((action) => {
      if (!suggestionsGroupedByPackageMap[action.meta.name]) {
        suggestionsGroupedByPackageMap[action.meta.name] = 0;
      }
      suggestionsGroupedByPackageMap[action.meta.name] += 1;
    });
  });

  const suggestionsGroupedByPackage = Object.keys(
    suggestionsGroupedByPackageMap
  )
    .filter((packageName) =>
      packageName === "" ? true : packageName.includes(searchTerm)
    )
    .map((packageName) => {
      return {
        packageName,
        count: suggestionsGroupedByPackageMap[packageName],
      };
    })
    .sort((a, b) => {
      return b.count - a.count;
    });

  return (
    <div>
      <Modal disablePortal={true} open={true} onClose={() => history.push("/")}>
        <div style={modalStyle} className={classes.paper}>
          <div className={classes.search}>
            <div className={classes.searchIcon}>
              <SearchIcon />
            </div>
            <InputBase
              placeholder="Search…"
              classes={{
                root: classes.inputRoot,
                input: classes.inputInput,
              }}
              onChange={(e) => setSearchTerm(e.target.value)}
              inputProps={{ "aria-label": "search" }}
            />
          </div>
          <FixedSizeList
            height={200}
            itemSize={46}
            itemCount={suggestionsGroupedByPackage.length}
            itemData={suggestionsGroupedByPackage}
          >
            {renderRow}
          </FixedSizeList>
        </div>
      </Modal>
    </div>
  );
}
