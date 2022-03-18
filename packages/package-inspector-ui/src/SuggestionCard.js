import React from "react";
import { useHistory } from "react-router-dom";
import makeStyles from "@mui/styles/makeStyles";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

const useStyles = makeStyles(() => ({
  root: {
    height: "100%",
    maxWidth: 345,
  },
  actionArea: {
    height: "100%",
    alignItems: "flex-start",
    display: "flex",
  },
  title: {
    fontSize: 14,
  },
}));

export default function SuggestionCard(props) {
  const history = useHistory();
  const classes = useStyles();

  return (
    <Card className={classes.root} variant="outlined">
      <CardActionArea
        className={classes.actionArea}
        onClick={() =>
          history.push(`/suggestion/${props.suggestion.id}`, { modal: true })
        }
      >
        <CardContent>
          <Typography
            className={classes.title}
            color="textSecondary"
            gutterBottom
          >
            {`This contains ${props.suggestion.actions.length.toLocaleString()} actions.`}
          </Typography>
          <Typography variant="h5" component="h2">
            {props.suggestion.name}
          </Typography>
          <Typography variant="body2" component="p">
            {props.suggestion.message}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
