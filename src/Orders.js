import React, {useContext} from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import {
  getEnemyItems,
  getItemById,
  getItemByXYAndType,
  getItemsByPlayer,
  getSelectedItem
} from "./itemsUtil";
import {ReducerDispatch} from "./App";

const isSelectedAction = (type, state) => {
  //TODO get first action that can be performed
  const itemAction = getItemById(state.selectedId, state.items).conditionalActions[0].action;
  console.log(itemAction);
  return itemAction && type === itemAction.type;
};

const selectedItemHasAp = (state) => {
  const selectedItem = getSelectedItem(state);
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

// TODO change so that misses picks DEFAULT_EVENT behavior (add some itemId)
const getNextActions = (state) => (items) => {
  return items.map((item) => item.conditionalActions.find((conditionalAction) => conditionalAction.condition(state)));
};

function TurnButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const {items, activePlayerId} = state;
  const handleEndTurn = (playerId) => () => {
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
        agentId: state.selectedId,
        targetId,
        condition,
      }
    })
  };
  return (<Button color={color} onClick={handleAttack}>Attack Enemy</Button>);
}

function DefendButton({areaId}) {
  const {state, dispatch} = useContext(ReducerDispatch);
  const condition = selectedItemHasAp;
  if (!condition(state)) {
    return null;
  }
  const color = getButtonColor('DEFEND', state);
  const handleDefend = () => {
    dispatch({
      type: 'DEFEND',
      payload: {
        agentId: state.selectedId,
        areaId: areaId,
        condition,
      }
    })
  };
  return (<Button color={color} onClick={handleDefend}>Defend Area {areaId}</Button>);
}

function BuildFarmButton() {
  const {state, dispatch} = useContext(ReducerDispatch);

  const condition = state => {
    return selectedItemHasAp(state)
      && !farmerHasFarm(state)
      && getItemByXYAndType(state.items)(getSelectedItem(state))('grass');
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
      && getItemByXYAndType(state.items)(getSelectedItem(state))('grass');
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
  const selectedItem = getSelectedItem(state);
  const target = getItemByXYAndType(state.items)(selectedItem)('crop');
  const condition = state => {
    const selectedItem = getSelectedItem(state);
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
        <DefendButton areaId={5}/>
        <BuildFarmButton/>
        <PlantCropButton/>
        <HarvestCropButton/>
      </CardContent>
    </Card>
  </div>
}
