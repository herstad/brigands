import React, {useContext} from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import {getEnemyItems, getItemByXYAndType, getItemsByPlayer} from "./itemsUtil";
import {ReducerDispatch} from "./App";
import {selectItemById, selectSelectedItem} from "./reducer";


const selectedItemHasAp = (state) => {
  const selectedItem = selectSelectedItem(state);
  return selectedItem.ap > 0 && selectedItem.playerId === state.activePlayerId;
};

const farmerHasFarm = (state) => {
  return state.items.some((item) => item.type === 'farm' && item.builderId === state.selectedId);
};

const getButtonColor = (type, state) => isSelectedAction(type, state) ? 'primary' : 'default';

const playerItemsWithAp = (playerId) => (items) => {
  return getItemsByPlayer(playerId, items)
    .filter(item => item.ap);
};

const getNextAction = state => conditionalActions => conditionalActions.find((conditionalAction) => conditionalAction.condition(state));

const getNextActions = (state) => (items) => {
  return items.map((item) => getNextAction(state)(item.conditionalActions));
};

const getItemsWithoutActions = state => items => {
  return items.filter(item => !getNextAction(state)(item.conditionalActions))
};

const isSelectedAction = (type, state) => {
  const conditionalAction = getNextAction(state)(selectSelectedItem(state).conditionalActions);
  return conditionalAction && type === conditionalAction.action.type;
};

function TurnButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const {items, activePlayerId} = state;
  const handleEndTurn = (playerId) => () => {

    // TODO make nicer
    getItemsWithoutActions(state)(playerItemsWithAp(playerId)(items)).forEach(item => dispatch({
      type: 'SET_UNIT_BEHAVIOR',
      payload: {
        getAgent: selectItemById(item.id),
        eventType: 'DEFAULT_EVENT',
      }
    }));

    getNextActions(state)(playerItemsWithAp(playerId)(items))
      .forEach((conditionalAction) => conditionalAction && conditionalAction.condition(state) ? dispatch(conditionalAction.action) : undefined);
    dispatch({
      type: 'END_TURN',
      payload: playerId
    })
  };
  return (
    <Button onClick={handleEndTurn(activePlayerId)}>Turn({activePlayerId}): {state.turn}</Button>
  );
}

function AttackButton({targetId}) {
  const {state, dispatch} = useContext(ReducerDispatch);
  const condition = selectedItemHasAp;
  if (!condition(state)) {
    return null;
  }
  const color = getButtonColor('ATTACK', state);
  const handleAttack = () => {
    dispatch({
      type: 'ATTACK',
      payload: {
        getAgent: selectItemById(state.selectedId),
        getTarget: selectItemById(targetId),
        condition,
      }
    })
  };
  return (<Button color={color} onClick={handleAttack}>Attack Enemy</Button>);
}

const moveCondition = (targetFunc) => (state) => {
  const agent = selectSelectedItem(state);
  const target = targetFunc(state);
  return selectedItemHasAp(state) && !(agent.x === target.x && agent.y === target.y);
};

const calculateDistance = agent => target => Math.abs(agent.x - target.x) + Math.abs(agent.y - target.y);

const compareDistance = agent => (firstEl, secondEl) => {
  const distance = calculateDistance(agent);
  return distance(firstEl) - distance(secondEl);
};
const targetClosestType = agent => type => state => state.items.filter(item => item.type === type).sort(compareDistance(agent))[0];

function MoveToGrassButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const agent = selectSelectedItem(state);
  const targetClosestGrass = targetClosestType(agent)('grass');

  const condition = moveCondition(targetClosestGrass);
  if (!condition(state)) {
    return null;
  }
  const color = getButtonColor('MOVE', state);
  const handleMoveToGrass = () => {
    const agentId = state.selectedId;
    dispatch({
      type: 'MOVE',
      payload: {
        getAgent: selectItemById(agentId),
        getTarget: targetClosestGrass,
        condition,
      }
    })
  };
  return (<Button color={color} onClick={handleMoveToGrass}>Move To Grass</Button>);
}

function BuildFarmButton() {
  const {state, dispatch} = useContext(ReducerDispatch);

  const condition = state => {
    return selectedItemHasAp(state)
      && !farmerHasFarm(state)
      && getItemByXYAndType(state.items)(selectSelectedItem(state))('grass');
  };
  if (!condition(state)) {
    return null;
  }
  const handleBuildFarm = () => {
    dispatch({
      type: 'BUILD_FARM',
      payload: {
        agentId: state.selectedId,
        condition,
      }
    })
  };
  return (<Button color='default' onClick={handleBuildFarm}>Build farm</Button>);
}

function PlantCropButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const condition = state => {
    return selectedItemHasAp(state)
      && farmerHasFarm(state)
      && getItemByXYAndType(state.items)(selectSelectedItem(state))('grass');
  };
  if (!condition(state)) {
    return null;
  }
  const handlePlantCrop = () => {
    dispatch({
      type: 'PLANT_CROP',
      payload: {
        agentId: state.selectedId,
        condition,
      }
    })
  };
  return (<Button color='default' onClick={handlePlantCrop}>PlantCrop</Button>);
}

function HarvestCropButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const selectedItem = selectSelectedItem(state);
  const target = getItemByXYAndType(state.items)(selectedItem)('crop');
  const condition = state => {
    const selectedItem = selectSelectedItem(state);
    const target = getItemByXYAndType(state.items)(selectedItem)('crop');
    return selectedItemHasAp(state) && !!target;
  };
  if (!condition(state)) {
    return null;
  }
  const handleHarvestCrop = () => {
    dispatch({
      type: 'HARVEST_CROP',
      payload: {
        agentId: state.selectedId,
        targetId: target.id,
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
        <BuildFarmButton/>
        <PlantCropButton/>
        <HarvestCropButton/>
      </CardContent>
    </Card>
  </div>
}
