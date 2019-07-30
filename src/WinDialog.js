import React, {useContext} from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import {ReducerDispatch} from "./App";
import {restart} from "./reducer";

export default function WinDialog() {
  const {state, dispatch} = useContext(ReducerDispatch);


  const handleRestart = () => dispatch(restart());
  return (
    <div>
      <Dialog open={!!state.winner} aria-labelledby="alert-dialog-title"
              aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">{`The winner is ${state.winner}!`}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">Play another round?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRestart} color="primary">Yes</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
