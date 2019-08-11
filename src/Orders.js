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
  buildWarehouse,
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

const playerItemsWithAp = (playerId) => (items) => {
  return getItemsByPlayer(playerId, items)
    .filter(item => item.ap > 0);
};

function OrderButton({action, children}) {
  const {state, dispatch} = useContext(ReducerDispatch);
  if (!shouldDisplayOrder(action)(state)) {
    return null;
  }
  const handleAction = () => dispatch(action);
  return (<Button onClick={handleAction}>{children}</Button>);
}

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

const shouldDisplayOrder = action => state => {
  const {getAgent, condition} = action.payload;
  return !!getAgent && unitHasAp(getAgent)(state) && condition(getAgent)(state);
};

function AttackButton({targetId}) {
  const {state} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const getTarget = () => selectItemById(targetId);
  const action = attack(getAgent)(getTarget);
  return (<OrderButton action={action}>Attack Enemy</OrderButton>);
}

const targetClosestType = type => getAgent => state => state.items.filter(item => item.type === type).sort(compareDistance(getAgent(state)))[0];

//TODO separate item type and if it is a home. hardcoding 'farm' as that is the only home type
const targetHome = getAgent => state => state.items.filter(item => item.type === 'farm' && item.builderId === getAgent(state).id)[0];

function MoveToGrassButton() {
  const getTarget = targetClosestType('grass');
  return (<MoveButton getTarget={getTarget} targetName={'Grass'}/>);
}

const getActiveEventTarget = getAgent => state => {
  const {activeEvent} = getAgent(state);
  return selectItemById(activeEvent.itemId)(state);
};

function MoveToEventButton() {
  return (<MoveButton getTarget={getActiveEventTarget} targetName={'Event'}/>);
}

function MoveToHomeButton() {
  return (<MoveButton getTarget={targetHome} targetName={'Home'}/>);
}

function MoveButton({getTarget, targetName,}) {
  const {state} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const action = moveTowardTarget(getAgent)(getTarget);
  return (<OrderButton action={action}>Move To {targetName}</OrderButton>);
}

function BuildWarehouseButton() {
  const {state} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const action = buildWarehouse(getAgent);
  return (<OrderButton action={action}>Build warehouse</OrderButton>);
}

function BuildFarmButton() {
  const {state} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const action = buildFarm(getAgent);
  return (<OrderButton action={action}>Build farm</OrderButton>);
}

function PlantCropButton() {
  const {state} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const action = plantCrop(getAgent);
  return (<OrderButton action={action}>PlantCrop</OrderButton>);
}

function HarvestCropButton() {
  const {state} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const action = harvestCrop(getAgent);
  return (<OrderButton action={action}>HarvestCrop</OrderButton>);
}

function UnloadResourceButton() {
  const {state} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const action = unloadResource(getAgent);
  return (<OrderButton action={action}>Unload Resource</OrderButton>);
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
        <BuildWarehouseButton/>
        <BuildFarmButton/>
        <PlantCropButton/>
        <HarvestCropButton/>
        <UnloadResourceButton/>
      </CardContent>
    </Card>
  </div>
}
