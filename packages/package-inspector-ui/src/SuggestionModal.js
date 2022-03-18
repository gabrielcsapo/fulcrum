import * as React from "react";
import { useParams, Link as RouterLink, useHistory } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import makeStyles from "@mui/styles/makeStyles";
import Modal from "@mui/material/Modal";
import Link from "@mui/material/Link";
import SearchIcon from "@mui/icons-material/Search";
import InputBase from "@mui/material/InputBase";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

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

export default function SuggestionModal(props) {
  const history = useHistory();
  const classes = useStyles();
  const [modalStyle] = React.useState(getModalStyle);
  const [searchTerm, setSearchTerm] = React.useState("");

  const { id: suggestionId } = useParams();
  const { suggestions = [] } = props.report || {};

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
