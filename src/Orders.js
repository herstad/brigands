import React, {useContext} from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import {getEnemyItems, getItemByXYAndType, getItemsByPlayer} from "./itemsUtil";
import {ReducerDispatch} from "./App";
import {
  attack,
  ATTACK,
  autoAction,
  buildFarm,
  END_TURN,
  harvestCrop,
  moveTowardTarget,
  plantCrop,
  selectItemById,
  selectSelectedItem,
  unloadResource
} from "./reducer";

//TODO replace id with getAgent
const unitHasAp = id => state => {
  const item = selectItemById(id)(state);
  return item.ap > 0 && item.playerId === state.activePlayerId;
};

const farmerHasFarm = getAgent => state => {
  return state.items.some((item) => item.type === 'farm' && item.builderId === getAgent(state).id);
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
    dispatch({
      type: END_TURN,
      payload: playerId
    })
  };
  return (
    <Button onClick={handleEndTurn(activePlayerId)}>Turn({activePlayerId}): {state.turn}</Button>
  );
}

const shouldDisplayOrder = id => condition => state => unitHasAp(id)(state) && condition(state);

function AttackButton({targetId}) {
  const {state, dispatch} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const getTarget = selectItemById(targetId);
  const condition = () => true;
  if (!shouldDisplayOrder(state.selectedId)(condition)(state)) {
    return null;
  }
  const color = getButtonColor('ATTACK', state);
  const handleAttack = () => dispatch(attack(getAgent)(getTarget)(condition));
  return (<Button color={color} onClick={handleAttack}>Attack Enemy</Button>);
}

const moveCondition = getTarget => getAgent => state => {
  const agent = getAgent(state);
  const target = getTarget(state);
  return agent && target && !(agent.x === target.x && agent.y === target.y);
};

const calculateDistance = agent => target => Math.abs(agent.x - target.x) + Math.abs(agent.y - target.y);

const compareDistance = agent => (firstEl, secondEl) => {
  const distance = calculateDistance(agent);
  return distance(firstEl) - distance(secondEl);
};
const targetClosestType = getAgent => type => state => state.items.filter(item => item.type === type).sort(compareDistance(getAgent(state)))[0];

//TODO separate item type and if it is a home. hardcoding 'farm' as that is the only home type
const targetHome = getAgent => state => state.items.filter(item => item.type === 'farm' && item.builderId === getAgent(state).id)[0];

const handleMove = getAgent => getTarget => condition => dispatch => () => dispatch(moveTowardTarget(getAgent)(getTarget)(condition));

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
  const condition = moveCondition(getTarget)(getAgent);
  if (!shouldDisplayOrder(state.selectedId)(condition)(state)) {
    return null;
  }
  const color = getButtonColor('MOVE', state);
  const handleMoveClick = handleMove(getAgent)(getTarget)(condition)(dispatch);
  return (<Button color={color} onClick={handleMoveClick}>Move To {targetName}</Button>);
}

function BuildFarmButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const condition = state => {
    return !farmerHasFarm(getAgent)(state) && getItemByXYAndType(state.items)(agent)('grass');
  };
  if (!shouldDisplayOrder(agent.id)(condition)(state)) {
    return null;
  }
  const handleBuildFarm = () => {
    dispatch(buildFarm(agent.id)(condition))
  };
  return (<Button color='default' onClick={handleBuildFarm}>Build farm</Button>);
}

function PlantCropButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const condition = state => {
    return farmerHasFarm(getAgent)(state) && getItemByXYAndType(state.items)(getAgent(state))('grass');
  };
  if (!shouldDisplayOrder(agent.id)(condition)(state)) {
    return null;
  }
  const handlePlantCrop = () => dispatch(plantCrop(agent.id)(condition));
  return (<Button color='default' onClick={handlePlantCrop}>PlantCrop</Button>);
}

function HarvestCropButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const getAgent = selectItemById(agent.id);
  const condition = state => getItemByXYAndType(state.items)(getAgent(state))('crop');
  if (!shouldDisplayOrder(agent.id)(condition)(state)) {
    return null;
  }
  const handleHarvestCrop = () => dispatch(harvestCrop(getAgent)(condition));
  return (<Button color='default' onClick={handleHarvestCrop}>HarvestCrop</Button>);
}

const unloadResourceCondition = getAgent => state => {
  const agent = getAgent(state);
  return agent.resources.length > 0 && getItemByXYAndType(state.items)(agent)('farm');
};

function UnloadResourceButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const condition = unloadResourceCondition(getAgent);
  if (!shouldDisplayOrder(state.selectedId)(condition)(state)) {
    return null;
  }
  const handleUnload = () => dispatch(unloadResource(getAgent)(condition));
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
