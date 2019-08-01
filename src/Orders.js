import React, {useContext} from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import {getEnemyItems, getItemsByPlayer} from "./itemsUtil";
import {ReducerDispatch} from "./App";
import {
  attack,
  autoAction,
  buildFarm,
  endTurn,
  harvestCrop,
  moveTowardTarget,
  plantCrop,
  selectItemById,
  selectSelectedItem,
  unloadResource
} from "./reducer";
import {compareDistance} from "./movement";

const unitHasAp = getAgent => state => {
  const item = getAgent(state);
  return item.ap > 0 && item.playerId === state.activePlayerId;
};

const getButtonColor = (type, state) => isSelectedAction(type, state) ? 'primary' : 'default';

const playerItemsWithAp = (playerId) => (items) => {
  return getItemsByPlayer(playerId, items)
    .filter(item => item.ap > 0);
};

const getNextAction = state => conditionalActions => conditionalActions.find((conditionalAction) => conditionalAction.condition(state));

const isSelectedAction = (type, state) => {
  const conditionalAction = getNextAction(state)(selectSelectedItem(state).conditionalActions);
  return conditionalAction && type === conditionalAction.action.type;
};

function TurnButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const {items, activePlayerId} = state;
  const handleEndTurn = (playerId) => () => {
    const playerItems = playerItemsWithAp(playerId)(items);
    playerItems.forEach(playerItem => {
      dispatch(autoAction(selectItemById(playerItem.id)));
    });
    dispatch(endTurn());
  };
  return (
    <Button onClick={handleEndTurn(activePlayerId)}>Turn({activePlayerId}): {state.turn}</Button>
  );
}

const shouldDisplayOrder = action => state => !!action.payload.getAgent && unitHasAp(action.payload.getAgent)(state) && action.payload.condition(state);

function AttackButton({targetId}) {
  const {state, dispatch} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const getTarget = selectItemById(targetId);
  const action = attack(getAgent)(getTarget);
  if (!shouldDisplayOrder(action)(state)) {
    return null;
  }
  const color = getButtonColor('ATTACK', state);
  const handleAttack = () => dispatch(action);
  return (<Button color={color} onClick={handleAttack}>Attack Enemy</Button>);
}

const targetClosestType = getAgent => type => state => state.items.filter(item => item.type === type).sort(compareDistance(getAgent(state)))[0];

//TODO separate item type and if it is a home. hardcoding 'farm' as that is the only home type
const targetHome = getAgent => state => state.items.filter(item => item.type === 'farm' && item.builderId === getAgent(state).id)[0];

function MoveToGrassButton() {
  const {state} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const getTarget = targetClosestType(getAgent)('grass');
  return (<MoveButton getTarget={getTarget} targetName={'Grass'}/>);
}

const getActiveEvent = getAgent => state => {
  const {activeEvent} = getAgent(state);
  return selectItemById(activeEvent.itemId)(state);
};

function MoveToEventButton() {
  const {state} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const getTarget = getActiveEvent(getAgent);
  return (<MoveButton getTarget={getTarget} targetName={'Event'}/>);
}

function MoveToHomeButton() {
  const {state} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const getTarget = targetHome(getAgent);
  return (<MoveButton getTarget={getTarget} targetName={'Home'}/>);
}

function MoveButton({getTarget, targetName,}) {
  const {state, dispatch} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const action = moveTowardTarget(getAgent)(getTarget);
  if (!shouldDisplayOrder(action)(state)) {
    return null;
  }
  const color = getButtonColor('MOVE', state);
  const handleMove = () => dispatch(action);
  return (<Button color={color} onClick={handleMove}>Move To {targetName}</Button>);
}

function BuildFarmButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const action = buildFarm(getAgent);
  if (!shouldDisplayOrder(action)(state)) {
    return null;
  }
  const handleBuildFarm = () => dispatch(action);
  return (<Button color='default' onClick={handleBuildFarm}>Build farm</Button>);
}

function PlantCropButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const action = plantCrop(getAgent);
  if (!shouldDisplayOrder(action)(state)) {
    return null;
  }
  const handlePlantCrop = () => dispatch(action);
  return (<Button color='default' onClick={handlePlantCrop}>PlantCrop</Button>);
}

function HarvestCropButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const action = harvestCrop(getAgent);
  if (!shouldDisplayOrder(action)(state)) {
    return null;
  }
  const handleHarvestCrop = () => dispatch(action);
  return (<Button color='default' onClick={handleHarvestCrop}>HarvestCrop</Button>);
}

function UnloadResourceButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const action = unloadResource(getAgent);
  if (!shouldDisplayOrder(action)(state)) {
    return null;
  }
  const handleUnload = () => dispatch(action);
  return (<Button color='default' onClick={handleUnload}>Unload Resource</Button>);
}

export default function Orders() {
  const {state} = useContext(ReducerDispatch);
  return <div>
    <Card>
      <CardContent>
        <TurnButton/>
        {
          getEnemyItems(state).map((enemy) => <AttackButton key={enemy.id} targetId={enemy.id}/>)
        }
        <MoveToGrassButton/>
        <MoveToEventButton/>
        <MoveToHomeButton/>
        <BuildFarmButton/>
        <PlantCropButton/>
        <HarvestCropButton/>
        <UnloadResourceButton/>
      </CardContent>
    </Card>
  </div>
}
