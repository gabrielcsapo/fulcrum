import React from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardActionArea from '@material-ui/core/CardActionArea';
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";

const useStyles = makeStyles((theme) => ({
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
  const { suggestion } = props;

  const classes = useStyles();

  return (
    <Card className={classes.root} variant="outlined">
      <CardActionArea className={classes.actionArea} onClick={() => history.push(`/suggestion/${suggestion.id}`, { modal: true })}>
        <CardContent>
          <Typography className={classes.title} color="textSecondary" gutterBottom>
            {`This contains ${suggestion.actions.length.toLocaleString()} actions.`}
          </Typography>
          <Typography variant="h5" component="h2">
            {suggestion.name}
          </Typography>
          <Typography variant="body2" component="p">
            {suggestion.message}
          </Typography>
        </CardContent>
      </CardActionArea>

    </Card>
  );
}
