import {generateId, generateState, PLAYERS} from "./stateGenerator";
import {
  getItemById,
  getItemByXYAndType,
  getItemsByPlayer,
  inRange,
  isPlayer,
  removeItemById,
  replaceItems,
  updateItem,
  updateItemById,
  updateItems
} from "./itemsUtil";
import {calculateDistance, move, toward} from "./movement";
import {pipe} from "./functional";

export const ATTACK = 'brigands/reducer/ATTACK';
export const AUTO_ACTION = 'brigands/reducer/AUTO_ACTION';
export const BUILD_FARM = 'brigands/reducer/BUILD_FARM';
export const END_TURN = 'brigands/reducer/END_TURN';
export const FINISH_TRAIN_EVENT = 'brigands/reducer/FINISH_TRAIN_EVENT';
export const HARVEST_CROP = 'brigands/reducer/HARVEST_CROP';
export const MOVE = 'brigands/reducer/MOVE';
export const PLANT_CROP = 'brigands/reducer/PLANT_CROP';
export const RESTART = 'brigands/reducer/RESTART';
export const SET_ACTIVE_EVENT = 'brigands/reducer/SET_ACTIVE_EVENT';
export const SET_SELECTED = 'brigands/reducer/SET_SELECTED';
export const SET_UNIT_BEHAVIOR = 'brigands/reducer/SET_UNIT_BEHAVIOR';
export const TRAIN_EVENT = 'brigands/reducer/TRAIN_EVENT';
export const UNLOAD_RESOURCE = 'brigands/reducer/UNLOAD_RESOURCE';
export const SLEEP = 'brigands/reducer/SLEEP';

export const selectItemById = id => state => getItemById(id, state.items);

export const selectSelectedItem = state => getItemById(state.selectedId, state.items);

const selectEventBehavior = behaviorName => eventType => state => {
  const behavior = state.behaviors[behaviorName] || {};
  const eventBehavior = behavior[eventType] || {};
  return eventBehavior.conditionalActions || [];
};

export const selectEvents = state => state.events;

export const selectActivePlayerId = state => state.activePlayerId;

const nextPlayer = (activePlayerId) => {
  const index = PLAYERS.findIndex((id) => id === activePlayerId);
  return PLAYERS[(index + 1) % PLAYERS.length];
};

const nextTurn = (turn, activePlayerId) => PLAYERS.slice(-1)[0] === activePlayerId ? turn + 1 : turn;

const getWinner = (state) => {
  return isLoser('ai', state.items) ? 'human' : isLoser('human', state.items) ? 'ai' : undefined;
};

const isLoser = (playerId, items) => {
  return getItemsByPlayer(playerId, items).every((item) => item.hp <= 0);
};

const consumeAp = (action, state) => {
  const {condition} = action.payload;
  // TODO require getAgent
  const agent = action.payload.agentId !== undefined ? selectItemById(action.payload.agentId)(state) : action.payload.getAgent(state);
  const selectedItem = {
    ...agent,
    ap: 0,
    action,
    condition,
  };
  // TODO rewrite without if
  if (!!selectedItem.training) {
    selectedItem.behaviorTraining.conditionalActions.push(action);
  } else if (selectedItem.conditionalActions) {
    const index = selectedItem.conditionalActions.findIndex(conditionalAction => conditionalAction.type === action.type);
    if (index > 0) {
      selectedItem.conditionalActions = selectedItem.conditionalActions.slice(index);
    }
  }
  return updateItem(selectedItem)(state);
};

const postAction = action => state => consumeAp(action, state);

const createBuilding = (getAgent, type, state) => {
  const builder = getAgent(state);
  const target = getItemByXYAndType(state.items)(builder)('grass');
  return createBuildingOn(getAgent)(type)(target.id)(state);
};

const createBuildingOn = getAgent => buildingType => targetId => state => {
  const builder = getAgent(state);
  const clearedItems = removeItemById(targetId, state.items);
  const building = {
    id: generateId(),
    builderId: builder.id,
    x: builder.x,
    y: builder.y,
    type: buildingType,
    createdTurn: state.turn,
    resources: [],
  };
  return {...state, items: [...clearedItems, building]}
};

const plantedShouldGrow = turn => item => item.type === 'planted' && item.createdTurn + 5 <= turn;

const hasBehaviorForEvent = item => event => state => {
  const behavior = selectEventBehavior(item.behaviorName)(event.type)(state);
  return !!behavior.length;
};

const getNextAction = getAgent => state => conditionalActions => conditionalActions.find(conditionalAction => conditionalAction.payload.condition(getAgent)(state));

export const endTurn = () => ({type: END_TURN,});

//TODO different range depending on type
const attackCondition = getTarget => getAgent => state => calculateDistance(getAgent(state))(getTarget(getAgent)(state)) <= 1;

export const attack = getAgent => getTarget => {
  return {
    type: ATTACK,
    payload: {
      getAgent,
      getTarget,
      condition: attackCondition(getTarget),
    }
  }
};

export const setUnitBehaviorAction = getAgent => ({
  type: SET_UNIT_BEHAVIOR,
  payload: {
    getAgent,
  }
});

export const autoAction = getAgent => ({
  type: AUTO_ACTION,
  payload: {
    getAgent,
  }
});

const farmerHasFarm = getAgent => state => {
  return state.items.some((item) => item.type === 'farm' && item.builderId === getAgent(state).id);
};

const farmCondition = getAgent => state => !farmerHasFarm(getAgent)(state) && getItemByXYAndType(state.items)(getAgent(state))('grass');

export const buildFarm = getAgent => {
  return {
    type: BUILD_FARM,
    payload: {
      getAgent,
      condition: farmCondition,
    }
  }
};

const plantCropCondition = getAgent => state => farmerHasFarm(getAgent)(state) && getItemByXYAndType(state.items)(getAgent(state))('grass');

export const plantCrop = getAgent => {
  return {
    type: PLANT_CROP,
    payload: {
      getAgent,
      condition: plantCropCondition,
    }
  }
};

const harvestCropCondition = getAgent => state => getItemByXYAndType(state.items)(getAgent(state))('crop');

export const harvestCrop = getAgent => {
  return {
    type: HARVEST_CROP,
    payload: {
      getAgent,
      condition: harvestCropCondition,
    }
  }
};

const moveCondition = getTarget => getAgent => state => {
  const agent = getAgent(state);
  const target = getTarget(getAgent)(state);
  return agent && target && !(agent.x === target.x && agent.y === target.y);
};

export const moveTowardTarget = getAgent => getTarget => {
  const condition = moveCondition(getTarget);
  return {
    type: MOVE,
    payload: {
      getAgent,
      getTarget,
      condition,
    }
  }
};

const unloadResourceCondition = getAgent => state => {
  const agent = getAgent(state);
  return agent.resources.length > 0 && getItemByXYAndType(state.items)(agent)('farm');
};

export const unloadResource = getAgent => {
  return {
    type: UNLOAD_RESOURCE,
    payload: {
      getAgent,
      condition: unloadResourceCondition,
    }
  }
};

export const setActiveEvent = getAgent => event => ({
  type: SET_ACTIVE_EVENT,
  payload: {
    getAgent,
    event,
  }
});

export const trainEventBehavior = getAgent => event => ({
  type: TRAIN_EVENT,
  payload: {
    getAgent,
    event,
  }
});

export const finishTrainEventBehavior = getAgent => ({
  type: FINISH_TRAIN_EVENT,
  payload: {
    getAgent,
  }
});

export const restart = () => ({type: RESTART, payload: undefined});

export const setSelectedItem = id => ({type: SET_SELECTED, payload: id});

export const sleepOneTurn = getAgent => turn => {
  //TODO refactor all conditions to accept getAgent
  //TODO refactor conditionalAction to just be actions
  const condition = getAgent => state => state.turn <= turn;
  return {
    type: SLEEP,
    payload: {
      getAgent,
      condition
    }
  };
};

export default function reducer(state, action) {
  console.log('Action');
  console.log(action);
  const {payload} = action;
  switch (action.type) {
    case END_TURN: {
      const apItems = updateItems((item) => isPlayer(selectActivePlayerId(state), item))({ap: 1})(state.items);
      const grownCrops = apItems.filter(plantedShouldGrow(state.turn));
      const newCrops = updateItems(plantedShouldGrow(state.turn))({type: 'crop',})(grownCrops);
      let items = replaceItems(apItems)(newCrops);
      const cropEvents = newCrops.map((item) => ({
        id: generateId(),
        type: 'CROP_GROWN',
        itemId: item.id,
        turn: state.turn
      }));
      const events = [...state.events, ...cropEvents].filter(e => e.turn === state.turn);

      const updatedEventItems = getItemsByPlayer(selectActivePlayerId(state), items).map(item => (
        {
          ...item,
          events: [...item.events, ...events.filter(event => hasBehaviorForEvent(item)(event)(state) || item.training)]
        }));
      items = replaceItems(items)(updatedEventItems);

      return {
        ...state,
        items,
        turn: nextTurn(state.turn, selectActivePlayerId(state)),
        activePlayerId: nextPlayer(selectActivePlayerId(state)),
        winner: getWinner(state),
        events,
      };
    }
    case AUTO_ACTION: {
      const {getAgent} = payload;
      const agent = getAgent(state);
      console.log(agent);
      const nextAction = getNextAction(getAgent)(state)(agent.conditionalActions);
      //TODO unclear order of execution. use pipe
      return nextAction ? reducer(state, nextAction) : reducer(reducer(state, setUnitBehaviorAction(getAgent)), action);
    }
    case RESTART: {
      const behaviors = state.behaviors;
      return {...generateState(), behaviors};
    }
    case SET_SELECTED: {
      return {...state, selectedId: payload};
    }
    case ATTACK: {
      const {getAgent, getTarget} = payload;
      const attacker = getAgent(state);
      const target = getTarget(getAgent)(state);

      if (!inRange(attacker, target)) {
        console.log('target not in range!');
        return state;
      }
      const updatedTarget = {...target, hp: target.hp - 1};
      return pipe(updateItem(updatedTarget), postAction(action))(state)
    }
    case MOVE: {
      const {getAgent, getTarget} = payload;
      const moveAgent = (s) => updateItem(move(getAgent(s), toward(getTarget(getAgent)(s))))(s);
      return pipe(moveAgent, postAction(action))(state);
    }
    case BUILD_FARM: {
      return createBuilding(payload.getAgent, 'farm', consumeAp(action, state));
    }
    case PLANT_CROP: {
      return createBuilding(payload.getAgent, 'planted', consumeAp(action, state));
    }
    case HARVEST_CROP: {
      const agent = payload.getAgent(state);
      const target = getItemByXYAndType(state.items)(agent)('crop');
      const addedResourceState = updateItemById({
        ...agent,
        resources: [...agent.resources, 'crop']
      }, state);
      return createBuildingOn(payload.getAgent)('grass')(target.id)(consumeAp(action, addedResourceState));
    }
    case UNLOAD_RESOURCE: {
      const agent = payload.getAgent(state);
      //TODO hardcoded farm as that is the only home type
      const target = getItemByXYAndType(state.items)(agent)('farm');
      const updatedTarget = {...target, resources: [...target.resources, agent.resources[0]]};
      const updatedAgent = {...agent, resources: agent.resources.slice(1)};
      return pipe(updateItem(updatedAgent), updateItem(updatedTarget), postAction(action))(state);
    }
    case TRAIN_EVENT: {
      const {getAgent, event} = payload;
      return updateItemById({
        id: getAgent(state).id,
        behaviorTraining: {name: 'farmer', eventType: event.type, event, conditionalActions: []},
        training: true,
      }, state);
    }
    case FINISH_TRAIN_EVENT: {
      const {getAgent} = payload;
      const agent = getAgent(state);
      const {name, eventType, conditionalActions} = agent.behaviorTraining;
      const behavior = state.behaviors[name] || {};
      const updatedBehavior = {
        ...behavior,
        name,
        [eventType]: {
          eventType,
          conditionalActions,
        },
      };
      const updatedBehaviorState = {
        ...state,
        behaviors: {...state.behaviors, [name]: updatedBehavior}
      };
      return updateItemById({
        ...agent,
        behaviorTraining: {},
        conditionalActions,
        training: false,
      }, updatedBehaviorState);

    }
    case SET_ACTIVE_EVENT : {
      const {event, getAgent} = payload;
      const agent = getAgent(state);
      return updateItemById({...agent, activeEvent: event}, state);
    }
    case SET_UNIT_BEHAVIOR: {
      //TODO call SET_ACTIVE_EVENT or refactor
      const {getAgent} = payload;
      const agent = getAgent(state);
      const activeEvent = agent.events.length > 0 ? agent.events[0] : {type: 'DEFAULT_EVENT'};
      const conditionalActions = selectEventBehavior(agent.behaviorName)(activeEvent.type)(state);
      const unitActions = conditionalActions.map(conditionalAction => {
          return {
            ...conditionalAction,
            payload: {...conditionalAction.payload, getAgent}
          }
        }
      );

      //TODO quickfix to stop endless recursion if there is no valid action for DEFAULT_EVENT
      console.log(unitActions);
      if (activeEvent.type === 'DEFAULT_EVENT' && !getNextAction(getAgent)(state)(unitActions)) {
        return reducer(state, sleepOneTurn(getAgent)(state.turn));
      }
      console.log('Updated actions for event: ' + activeEvent.type);
      return updateItemById({
        ...agent,
        activeEvent,
        events: agent.events.slice(1),
        conditionalActions: [...unitActions]
      }, state);
    }
    case SLEEP: {
      const {getAgent} = payload;
      const agent = getAgent(state);
      return updateItem({
        ...agent,
        activeEvent: {type: 'SLEEPING'},
        conditionalActions: [action]
      })(state)
    }
    default:
      return state;
  }
};
