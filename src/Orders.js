import React, {useContext} from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import {
  getEnemyItems,
  getItemById,
  getItemsByPlayer,
  getItemsByXY,
  getSelectedItem
} from "./itemsUtil";
import {ReducerDispatch} from "./App";

const isSelectedAction = (type, state) => {
  const itemAction = getItemById(state.selectedId, state.items).action;
  return itemAction && type === itemAction.type;
};

const selectedItemHasAp = (state) => {
  const selectedItem = getSelectedItem(state);
  return selectedItem.ap < 1 || selectedItem.playerId !== state.activePlayerId;
};

const farmerHasFarm = (state) => {
  return !state.items.some((item) => item.type === 'farm' && item.builderId === state.selectedId);
};

const getButtonColor = (type, state) => isSelectedAction(type, state) ? 'primary' : 'default';

function TurnButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const {items, activePlayerId} = state;
  const handleEndTurn = (playerId) => () => {
    getItemsByPlayer(playerId, items)
      .filter((item) => item.action && item.ap)
      .forEach((item) => dispatch(item.action));
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
  if (selectedItemHasAp(state)) {
    return null;
  }
  const color = getButtonColor('ATTACK', state);
  const handleAttack = () => {
    dispatch({
      type: 'ATTACK',
      payload: {
        agentId: state.selectedId,
        targetId
      }
    })
  };
  return (<Button color={color} onClick={handleAttack}>Attack Enemy</Button>);
}

function DefendButton({areaId}) {
  const {state, dispatch} = useContext(ReducerDispatch);
  if (selectedItemHasAp(state)) {
    return null;
  }
  const color = getButtonColor('DEFEND', state);
  const handleDefend = () => {
    dispatch({
      type: 'DEFEND',
      payload: {
        agentId: state.selectedId,
        areaId: areaId,
      }
    })
  };
  return (<Button color={color} onClick={handleDefend}>Defend Area {areaId}</Button>);
}

function BuildFarmButton() {
  const {state, dispatch} = useContext(ReducerDispatch);

  if (selectedItemHasAp(state) || !farmerHasFarm(state)) {
    return null;
  }
  const handleBuildFarm = () => {
    dispatch({
      type: 'BUILD_FARM',
      payload: {
        agentId: state.selectedId,
      }
    })
  };
  return (<Button color='default' onClick={handleBuildFarm}>Build farm</Button>);
}


function PlantCropButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  if (selectedItemHasAp(state) || farmerHasFarm(state)) {
    return null;
  }
  const handlePlantCrop = () => {
    dispatch({
      type: 'PLANT_CROP',
      payload: {
        agentId: state.selectedId,
      }
    })
  };
  return (<Button color='default' onClick={handlePlantCrop}>PlantCrop</Button>);
}

function HarvestCropButton() {
  const {state, dispatch} = useContext(ReducerDispatch);
  const selectedItem = getSelectedItem(state);
  const target = getItemsByXY(selectedItem, state.items).find((item) => item.type === 'crop');
  if (selectedItemHasAp(state) || !target) {
    return null;
  }
  const handlePlantCrop = () => {
    dispatch({
      type: 'HARVEST_CROP',
      payload: {
        agentId: state.selectedId,
        targetId: target.id,
      }
    })
  };
  return (<Button color='default' onClick={handlePlantCrop}>HarvestCrop</Button>);
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
