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
import {move, toward} from "./movement";
import {pipe} from "./functional";

export const ATTACK = 'ATTACK';
export const AUTO_ACTION = 'AUTO_ACTION';
export const BUILD_FARM = 'BUILD_FARM';
export const END_TURN = 'END_TURN';
export const FINISH_TRAIN_EVENT = 'FINISH_TRAIN_EVENT';
export const HARVEST_CROP = 'HARVEST_CROP';
export const MOVE = 'MOVE';
export const PLANT_CROP = 'PLANT_CROP';
export const RESTART = 'RESTART';
export const SET_ACTIVE_EVENT = 'SET_ACTIVE_EVENT';
export const SET_SELECTED = 'SET_SELECTED';
export const SET_UNIT_BEHAVIOR = 'SET_UNIT_BEHAVIOR';
export const TRAIN_EVENT = 'TRAIN_EVENT';
export const UNLOAD_RESOURCE = 'UNLOAD_RESOURCE';


export const selectItemById = id => state => getItemById(id, state.items);

export const selectSelectedItem = (state) => getItemById(state.selectedId, state.items);

const selectEventBehavior = behaviorName => eventType => state => {
  const behavior = state.behaviors[behaviorName] || {};
  const eventBehavior = behavior[eventType] || {};
  return eventBehavior.conditionalActions || [];
};

export const selectEvents = state => state.events;

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
    const conditionalAction = {action, condition};
    selectedItem.behaviorTraining.conditionalActions.push(conditionalAction);
  } else if (selectedItem.conditionalActions) {
    const index = selectedItem.conditionalActions.findIndex(conditionalAction => conditionalAction.action.type === action.type);
    if (index > 0) {
      selectedItem.conditionalActions = selectedItem.conditionalActions.slice(index);
    }
  }
  return updateItem(selectedItem)(state);
};

const postAction = action => state => consumeAp(action, state);

const createBuilding = (builderId, type, state) => {
  const builder = selectItemById(builderId)(state);
  const target = getItemByXYAndType(state.items)(builder)('grass');
  return createBuildingOn(builderId)(type)(target.id)(state);
};

const createBuildingOn = builderId => buildingType => targetId => state => {
  const builder = selectItemById(builderId)(state);
  const clearedItems = removeItemById(targetId, state.items);
  const building = {
    id: generateId(),
    builderId,
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

// TODO remove original
const getNextAction = state => conditionalActions => conditionalActions.find(conditionalAction => conditionalAction.condition(state));

export const attack = getAgent => getTarget => condition => ({
  type: ATTACK,
  payload: {
    getAgent,
    getTarget,
    condition,
  }
});

export const setUnitBehaviorAction = getAgent => ({
  type: 'SET_UNIT_BEHAVIOR',
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

export const buildFarm = agentId => condition => ({
  type: BUILD_FARM,
  payload: {
    agentId,
    condition,
  }
});

export const plantCrop = agentId => condition => ({
  type: PLANT_CROP,
  payload: {
    agentId,
    condition,
  }
});

export const harvestCrop = getAgent => condition => ({
  type: HARVEST_CROP,
  payload: {
    getAgent,
    condition,
  }
});

export const moveTowardTarget = getAgent => getTarget => condition => ({
  type: MOVE,
  payload: {
    getAgent,
    getTarget,
    condition,
  }
});

export const unloadResource = getAgent => condition => ({
  type: UNLOAD_RESOURCE,
  payload: {
    getAgent,
    condition,
  }
});

export const setActiveEvent = getAgent => event => ({
  type: SET_ACTIVE_EVENT,
  payload: {
    getAgent,
    event,
  }
});

export const trainEventBehavior = agentId => event => ({
  type: TRAIN_EVENT,
  payload: {
    agentId,
    event,
  }
});

export const finishTrainEventBehavior = agentId => ({
  type: FINISH_TRAIN_EVENT,
  payload: {
    agentId,
  }
});

export const restart = () => ({type: 'RESTART', payload: undefined});

export const setSelectedItem = id => ({type: SET_SELECTED, payload: id});

export default function reducer(state, action) {
  console.log('Action');
  console.log(action);
  const {payload} = action;
  switch (action.type) {
    case 'END_TURN': {
      const apItems = updateItems((item) => isPlayer(payload, item))({ap: 1})(state.items);
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


      const updatedEventItems = getItemsByPlayer(state.activePlayerId, items).map(item => (
        {
          ...item,
          events: [...item.events, ...events.filter(event => hasBehaviorForEvent(item)(event)(state) || item.training)]
        }));
      items = replaceItems(items)(updatedEventItems);


      return {
        ...state,
        items,
        turn: nextTurn(state.turn, state.activePlayerId),
        activePlayerId: nextPlayer(state.activePlayerId),
        winner: getWinner(state),
        events,
      };
    }
    case AUTO_ACTION: {
      const {getAgent} = payload;
      const agent = getAgent(state);
      console.log(agent);
      const nextAction = getNextAction(state)(agent.conditionalActions);
      //TODO unclear order of execution.
      return nextAction ? reducer(state, nextAction.action) : reducer(reducer(state, setUnitBehaviorAction(getAgent)), action);
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
      const target = getTarget(state);

      if (!inRange(attacker, target)) {
        console.log('target not in range!');
        return state;
      }
      const updatedTarget = {...target, hp: target.hp - 1};
      return pipe(updateItem(updatedTarget), postAction(action))(state)
    }
    case MOVE: {
      const {getAgent, getTarget} = payload;
      const moveAgent = (s) => updateItem(move(getAgent(s), toward(getTarget(s))))(s);
      return pipe(moveAgent, postAction(action))(state);
    }
    case BUILD_FARM: {
      return createBuilding(payload.agentId, 'farm', consumeAp(action, state));
    }
    case PLANT_CROP: {
      return createBuilding(payload.agentId, 'planted', consumeAp(action, state));
    }
    case HARVEST_CROP: {
      const agent = payload.getAgent(state);
      const target = getItemByXYAndType(state.items)(agent)('crop');
      const addedResourceState = updateItemById({
        ...agent,
        resources: [...agent.resources, 'crop']
      }, state);
      return createBuildingOn(agent.id)('grass')(target.id)(consumeAp(action, addedResourceState));
    }
    case UNLOAD_RESOURCE: {
      const agent = payload.getAgent(state);
      //TODO hardcoded farm as that is the only home type
      const target = getItemByXYAndType(state.items)(agent)('farm');
      const updatedTarget = {...target, resources: [...target.resources, agent.resources[0]]};
      const updatedAgent = {...agent, resources: agent.resources.slice(1)};
      return pipe(updateItem(updatedAgent), updateItem(updatedTarget), postAction(action))(state);
      // return updateItemById(updatedTarget, updateItemById(updatedAgent, consumeAp(action,
      // state)));
    }
    case TRAIN_EVENT: {
      const {agentId, event} = payload;
      return updateItemById({
        id: agentId,
        behaviorTraining: {name: 'farmer', eventType: event.type, event, conditionalActions: []},
        training: true,
      }, state);
    }
    case FINISH_TRAIN_EVENT: {
      const {agentId} = payload;
      const agent = selectItemById(agentId)(state);
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
      const agent = payload.getAgent(state);
      const activeEvent = agent.events.length > 0 ? agent.events[0] : {type: 'DEFAULT_EVENT'};
      const conditionalActions = selectEventBehavior(agent.behaviorName)(activeEvent.type)(state);

      //TODO quickfix to stop endless recursion if there is no valid action for DEFAULT_EVENT
      if (activeEvent.type === 'DEFAULT_EVENT' && !getNextAction(state)(conditionalActions)) {
        return updateItem({
          ...agent,
          activeEvent: {type: 'SLEEPING'},
          conditionalActions: [{action: {type: 'SLEEP', payload: {}}, condition: () => true}]
        })(state)
      }
      console.log('Updated actions for event: ' + activeEvent.type);
      return updateItemById({
        ...agent,
        activeEvent,
        events: agent.events.slice(1),
        conditionalActions: [...conditionalActions]
      }, state);
    }
    default:
      return state;
  }
};
