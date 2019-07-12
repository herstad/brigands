import React, {useContext} from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import {getEnemyItems, getItemByXYAndType, getItemsByPlayer} from "./itemsUtil";
import {ReducerDispatch} from "./App";
import {selectItemById, selectSelectedItem} from "./reducer";

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
      dispatch({
        type: 'AUTO_ACTION',
        payload: {
          getAgent: selectItemById(playerItem.id)
        }
      });
    });
    dispatch({
      type: 'END_TURN',
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
  const handleAttack = () => {
    dispatch({
      type: 'ATTACK',
      payload: {
        getAgent,
        getTarget,
        condition,
      }
    })
  };
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

const handleMove = getAgent => getTarget => condition => dispatch => () => {
  dispatch({
    type: 'MOVE',
    payload: {
      getAgent,
      getTarget,
      condition,
    }
  })
};

function MoveToGrassButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const getTarget = targetClosestType(getAgent)('grass');
  const condition = moveCondition(getTarget)(getAgent);
  if (!shouldDisplayOrder(state.selectedId)(condition)(state)) {
    return null;
  }
  const color = getButtonColor('MOVE', state);
  const handleMoveToGrass = handleMove(getAgent)(getTarget)(condition)(dispatch);
  return (<Button color={color} onClick={handleMoveToGrass}>Move To Grass</Button>);
}

const getCurrentEvent = getAgent => state => {
  const {currentEvent} = getAgent(state);
  return selectItemById(currentEvent.itemId)(state);
};

const handleMoveToEvent = getAgent => condition => dispatch => () => {
  handleMove(getAgent)(getCurrentEvent(getAgent))(condition)(dispatch)();
};

const moveEventCondition = getAgent => state => {
  const getTarget = getCurrentEvent(getAgent);
  return getTarget(state) && moveCondition(getTarget)(getAgent)(state);
};

function MoveToEventButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const getAgent = selectItemById(state.selectedId);
  const condition = moveEventCondition(getAgent);
  if (!shouldDisplayOrder(state.selectedId)(condition)(state)) {
    return null;
  }
  const color = getButtonColor('MOVE', state);
  const handleMoveToEventClick = handleMoveToEvent(getAgent)(condition)(dispatch);
  return (
    <Button color={color} onClick={handleMoveToEventClick}>Move To Event </Button>);
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
    dispatch({
      type: 'BUILD_FARM',
      payload: {
        agentId: agent.id,
        condition,
      }
    })
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
  const handlePlantCrop = () => {
    dispatch({
      type: 'PLANT_CROP',
      payload: {
        agentId: agent.id,
        condition,
      }
    })
  };
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
  const handleHarvestCrop = () => {
    dispatch({
      type: 'HARVEST_CROP',
      payload: {
        getAgent,
        condition,
      }
    })
  };
  return (<Button color='default' onClick={handleHarvestCrop}>HarvestCrop</Button>);
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
        <BuildFarmButton/>
        <PlantCropButton/>
        <HarvestCropButton/>
      </CardContent>
    </Card>
  </div>
}
