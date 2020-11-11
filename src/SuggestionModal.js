import * as React from "react";
import { useParams, Link as RouterLink, useHistory } from "react-router-dom";
import { fade, makeStyles } from "@material-ui/core/styles";
import Modal from "@material-ui/core/Modal";
import Link from "@material-ui/core/Link";
import SearchIcon from "@material-ui/icons/Search";
import InputBase from "@material-ui/core/InputBase";

import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  paper: {
    position: "absolute",
    width: "75%",
    backgroundColor: theme.palette.background.paper,
    border: "2px solid #000",
    boxShadow: theme.shadows[5],
  },
  search: {
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: fade(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: fade(theme.palette.common.white, 0.25),
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
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
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
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "20ch",
    },
  },
  flexContainer: {
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
  },
  tableContainer: {
    maxHeight: 300,
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

export default function SuggestionModal() {
  const history = useHistory();
  const classes = useStyles();
  const [modalStyle] = React.useState(getModalStyle);
  const [searchTerm, setSearchTerm] = React.useState("");

  const { id: suggestionId } = useParams();
  const { suggestions } = report;

  const selectedSuggestion = suggestions.find(
    (suggestion) => suggestion.id === suggestionId
  );

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
          <TableContainer component={Paper} className={classes.tableContainer}>
            <Table aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell align="left">Module Name</TableCell>
                  <TableCell align="left">Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedSuggestion.actions
                  .filter((action) => {
                    if (!searchTerm) {
                      return true;
                    } else {
                      return (
                        action.meta.name.includes(searchTerm) ||
                        action.message.includes(searchTerm)
                      );
                    }
                  })
                  .map((action, i) => (
                    <TableRow key={i}>
                      <TableCell align="left">
                        <Link
                          component={RouterLink}
                          to={`/dependencies/${encodeURIComponent(
                            action.meta.name
                          )}`}
                        >
                          {action.meta.name}
                        </Link>{" "}
                      </TableCell>
                      <TableCell align="left">{action.message}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </Modal>
    </div>
  );
}
