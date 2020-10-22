import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import { red } from "@material-ui/core/colors";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100%",
    maxWidth: 345,
  },
  media: {
    height: 0,
    paddingTop: "56.25%", // 16:9
  },
  expand: {
    transform: "rotate(0deg)",
    marginLeft: "auto",
    transition: theme.transitions.create("transform", {
      duration: theme.transitions.duration.shortest,
    }),
  },
  expandOpen: {
    transform: "rotate(180deg)",
  },
  avatar: {
    backgroundColor: red[500],
  },
}));

export default function SuggestionCard(props) {
  const { suggestion } = props;

  const classes = useStyles();

  return (
    <Card className={classes.root}>
      <CardHeader
        title={suggestion.name}
        subheader={`This contains ${suggestion.actions.length.toLocaleString()} actions.`}
      />
      <CardContent>
        <Typography variant="body2" color="textSecondary" component="p">
          {suggestion.message}
        </Typography>
      </CardContent>
    </Card>
  );
}
