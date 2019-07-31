import React, {useContext} from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import LinearProgress from '@material-ui/core/LinearProgress';
import {ReducerDispatch} from "./App";
import Button from "@material-ui/core/Button";
import {
  finishTrainEventBehavior,
  selectItemById,
  selectSelectedItem,
  setActiveEvent,
  trainEventBehavior
} from "./reducer";

function UnitCard() {
  const {state} = useContext(ReducerDispatch);
  const selected = selectSelectedItem(state);
  if (selected === undefined) {
    return null;
  }
  const {id, playerId, x, y, hp, ap, type, resources} = selected;
  const maxHp = 5;
  const relativeHp = hp / maxHp * 100;
  const defaultEvent = {type: 'DEFAULT_EVENT', itemId: selected.id};
  return (
    <Card>
      <CardContent>
        <Typography>id:{id}</Typography>
        <Typography>player:{playerId}</Typography>
        <Typography>x:{x}</Typography>
        <Typography>y:{y}</Typography>
        <Typography>hp:{hp}</Typography>
        <Typography>ap:{ap}</Typography>
        <Typography>type:{type}</Typography>
        <Typography>resource: {resources} </Typography>
        <LinearProgress variant="determinate" value={relativeHp}/>
        <TrainEventButton event={defaultEvent}/>
        <FinishTrainEventButton/>
      </CardContent>
    </Card>
  );
}

function SelectEventButton({event}) {
  const {state, dispatch} = useContext(ReducerDispatch);
  const getAgent = selectSelectedItem;
  const agent = getAgent(state);
  if (agent === undefined || agent.activeEvent === event) {
    return null;
  }
  const handleSelectEvent = () => dispatch(setActiveEvent(getAgent)(event));
  return (<Button color='default' onClick={handleSelectEvent}>Select event {event.type}</Button>);
}

function TrainEventButton({event}) {
  const {state, dispatch} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  if (agent === undefined || agent.training) {
    return null;
  }
  const handleTrainEvent = () => {
    dispatch(setActiveEvent(selectItemById(agent.id))(event));
    dispatch(trainEventBehavior(agent.id)(event));
  };
  return (<Button color='default' onClick={handleTrainEvent}>Train {event.type} Behavior</Button>);
}

function FinishTrainEventButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  if (agent === undefined || !agent.training) {
    return null;
  }
  const handleTrainEvent = () => dispatch(finishTrainEventBehavior(agent.id));
  return (
    <Button color='default' onClick={handleTrainEvent}>Finish train event Behavior</Button>);
}

function EventCard({event}) {
  const {state} = useContext(ReducerDispatch);
  // TODO check item connected to event  still exists
  const {x, y, type} = (event.itemId ? selectItemById(event.itemId)(state) || {} : {});
  return (
    <Card>
      <CardContent>
        <Typography>type:{event.type}</Typography>
        <Typography>x:{x}</Typography>
        <Typography>y:{y}</Typography>
        <Typography>itemType:{type}</Typography>
        <SelectEventButton event={event}/>
        <TrainEventButton event={event}/>
      </CardContent>
    </Card>
  )
}

function EventsInfo() {
  const {state} = useContext(ReducerDispatch);
  const {events} = state;
  const selectedUnit = selectSelectedItem(state);
  const newEvents = selectedUnit.activeEvent ? [selectedUnit.activeEvent, ...events] : events;
  return newEvents.map((event, index) => <EventCard key={"event" + index} event={event}/>);
}

export default function InfoPane() {
  return <div>
    <UnitCard/>
    <EventsInfo/>
  </div>
}
