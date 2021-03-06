import {generateId, generateState, PLAYERS} from "./stateGenerator";
import {
  getItemById,
  getItemByXYAndType,
  getItemsByPlayer,
  inRange,
  removeItemById,
  updateItem,
  updateItemById,
  updateItems
} from "./itemsUtil";
import {calculateDistance, move} from "./movement";
import {pipe} from "./functional";
import {CROP, FARM, GRASS, PATH, PLANTED, WAREHOUSE} from "./itemTypes";
import {CROP_GROWN, DEFAULT_EVENT, RESOURCE_PICKUP, SLEEPING} from "./events/eventTypes";
import {hasBehaviorForEvent, isEventVisible} from "./events/eventUtils";
import findPath, {itemsToNodes, itemToNode} from "./movement/findPath";

export const ATTACK = 'brigands/reducer/ATTACK';
export const AUTO_ACTION = 'brigands/reducer/AUTO_ACTION';
export const BUILD_FARM = 'brigands/reducer/BUILD_FARM';
export const BUILD_WAREHOUSE = 'brigands/reducer/BUILD_WAREHOUSE';
export const END_TURN = 'brigands/reducer/END_TURN';
export const FINISH_TRAIN_EVENT = 'brigands/reducer/FINISH_TRAIN_EVENT';
export const HARVEST_CROP = 'brigands/reducer/HARVEST_CROP';
export const MOVE = 'brigands/reducer/MOVE';
export const MAKE_PATH = 'brigands/reducer/MAKE_PATH';
export const PLANT_CROP = 'brigands/reducer/PLANT_CROP';
export const RESTART = 'brigands/reducer/RESTART';
export const SET_ACTIVE_EVENT = 'brigands/reducer/SET_ACTIVE_EVENT';
export const SET_SELECTED = 'brigands/reducer/SET_SELECTED';
export const SET_UNIT_BEHAVIOR = 'brigands/reducer/SET_UNIT_BEHAVIOR';
export const TRAIN_EVENT = 'brigands/reducer/TRAIN_EVENT';
export const UNLOAD_RESOURCE = 'brigands/reducer/UNLOAD_RESOURCE';
export const LOAD_RESOURCE = 'brigands/reducer/LOAD_RESOURCE';
export const SLEEP = 'brigands/reducer/SLEEP';

export const selectItemById = id => state => getItemById(id, state.items);

export const selectSelectedItem = state => getItemById(state.selectedId, state.items);

export const selectEventBehavior = behaviorName => eventType => state => {
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

const delegateToReducer = action => state => reducer(state, action);

const consumeAp = action => state => {
  const {getAgent, apCost = () => () => 10} = action.payload;
  const agent = getAgent(state);
  return updateItem({...agent, ap: agent.ap - apCost(action)(state)})(state)
};

const recordAction = action => state => {
  const {getAgent} = action.payload;
  const agent = getAgent(state);
  return !agent.training ? state : updateItem(
    {
      ...agent,
      behaviorTraining: {
        ...agent.behaviorTraining,
        conditionalActions: [...agent.behaviorTraining.conditionalActions, action]
      }
    })(state);
};

const postAction = action => state => {
  return pipe(consumeAp(action), recordAction(action))(state);
};

const createBuilding = (getAgent, type, state) => {
  const builder = getAgent(state);
  const target = getItemByXYAndType(state.items)(builder)(GRASS);
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

const plantedShouldGrow = turn => item => item.type === PLANTED && item.createdTurn + 5 <= turn;

const getNextActions = getAgent => state => {
  const {conditionalActions} = getAgent(state);
  const index = conditionalActions.findIndex(conditionalAction => conditionalAction.payload.condition(getAgent)(state));
  return index >= 0 ? conditionalActions.slice(index) : [];
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

const buildingTypeExists = type => getAgent => state => {
  return !state.items.some((item) => item.type === type) && getItemByXYAndType(state.items)(getAgent(state))(GRASS);
};

export const buildWarehouse = getAgent => {
  return {
    type: BUILD_WAREHOUSE,
    payload: {
      getAgent,
      condition: buildingTypeExists(WAREHOUSE),
    }
  }
};

const farmerHasFarm = getAgent => state => {
  return state.items.some((item) => item.type === FARM && item.builderId === getAgent(state).id);
};

const farmCondition = getAgent => state => !farmerHasFarm(getAgent)(state) && getItemByXYAndType(state.items)(getAgent(state))(GRASS);

export const buildFarm = getAgent => {
  return {
    type: BUILD_FARM,
    payload: {
      getAgent,
      condition: farmCondition,
    }
  }
};

const plantCropCondition = getAgent => state => farmerHasFarm(getAgent)(state) && getItemByXYAndType(state.items)(getAgent(state))(GRASS);

export const plantCrop = getAgent => {
  return {
    type: PLANT_CROP,
    payload: {
      getAgent,
      condition: plantCropCondition,
    }
  }
};

const harvestCropCondition = getAgent => state => getItemByXYAndType(state.items)(getAgent(state))(CROP);

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
  //TODO move apCost to reducer
  const apCost = action => state => 0;
  return {
    type: MOVE,
    payload: {
      getAgent,
      getTarget,
      apCost,
      condition,
    }
  }
};

const makePathTarget = getAgent => state => getItemByXYAndType(state.items)(getAgent(state))(GRASS);

const makePathCondition = getTarget => getAgent => state => !!getTarget(getAgent)(state);

export const makePath = getAgent => ({
  type: MAKE_PATH,
  payload: {
    getAgent,
    getTarget: makePathTarget,
    condition: makePathCondition(makePathTarget),
  }
});

const unloadResourceCondition = getAgent => state => {
  const agent = getAgent(state);
  const getByType = getItemByXYAndType(state.items)(agent);
  return agent.resources.length > 0 && (getByType(FARM) || getByType(WAREHOUSE));
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

const loadResourceCondition = getAgent => state => {
  const agent = getAgent(state);
  const getByType = getItemByXYAndType(state.items)(agent);
  const target = getByType(FARM) || getByType(WAREHOUSE) || {};
  return !!target.resources && target.resources.length > 0;
};

export const loadResource = getAgent => {
  return {
    type: LOAD_RESOURCE,
    payload: {
      getAgent,
      condition: loadResourceCondition,
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
  const condition = getAgent => state => state.turn <= turn;
  return {
    type: SLEEP,
    payload: {
      getAgent,
      condition
    }
  };
};

const createEvent = type => itemId => turn => ({
  id: generateId(),
  type,
  itemId,
  turn,
  local: false,
});

const createLocalEvent = type => itemId => turn => agentId => ({
  ...createEvent(type)(itemId)(turn),
  agentId,
  local: true,
});

const publishEvents = events => state => {
  return {...state, events: [...state.events, ...events]}
};
//TODO hack, WAREHOUSE is only building that any unit can build
const isHome = target => agent => target.builderId === agent.id && target.type !== WAREHOUSE;

const updateItemsByActivePlayer = fn => state => {
  const updates = getItemsByPlayer(selectActivePlayerId(state), state.items).map(item => updateItem(fn(item)));
  return pipe(...updates)(state);
};

const replenishAp = state => {
  const updateFn = item => ({...item, ap: item.ap > 0 ? 10 : item.ap + 10});
  return updateItemsByActivePlayer(updateFn)(state);
};

const cropsGrownEvents = state => {
  const grownCrops = state.items.filter(plantedShouldGrow(state.turn));
  const cropEvents = grownCrops.map((item) => (createLocalEvent(CROP_GROWN)(item.id)(state.turn)(item.builderId)));
  return {...state, events: [...state.events, ...cropEvents]}
};

const growCrops = state => updateItems(plantedShouldGrow(state.turn))({type: CROP,})(state);

const filterOldEvents = state => ({
  ...state,
  events: state.events.filter(e => e.turn === state.turn)
});

const addEventsToUnits = state => {
  const updateFn = item => (
    {
      ...item,
      events: [...item.events, ...state.events.filter(event => isEventVisible(item.id)(event) && (hasBehaviorForEvent(item)(event)(state) || item.training))]
    });
  return updateItemsByActivePlayer(updateFn)(state);
};

const setNextTurn = state => ({...state, turn: nextTurn(state.turn, selectActivePlayerId(state))});

const setNextPlayer = state => ({
  ...state,
  activePlayerId: nextPlayer(selectActivePlayerId(state))
});

const updateConditionalActions = getAgent => state => {
  const nextActions = getNextActions(getAgent)(state);
  return updateItem({...getAgent(state), conditionalActions: nextActions})(state);
};

const performCurrentAction = getAgent => state => {
  const actions = getAgent(state).conditionalActions;
  return actions.length > 0 ? delegateToReducer(actions[0])(state) : state;
};

export default function reducer(state, action) {
  console.log('Action');
  console.log(action);
  const {payload} = action;
  switch (action.type) {
    case END_TURN: {
      return pipe(replenishAp, cropsGrownEvents, growCrops, filterOldEvents, addEventsToUnits, setNextTurn, setNextPlayer)(state);
    }
    case AUTO_ACTION: {
      const {getAgent} = payload;
      const agent = getAgent(state);
      if (agent.ap <= 0) {
        return state;
      }
      //TODO simplify
      const nextActions = getNextActions(getAgent)(state);
      return nextActions.length > 0 ? pipe(updateConditionalActions(getAgent), performCurrentAction(getAgent), delegateToReducer(action))(state) : pipe(delegateToReducer(setUnitBehaviorAction(getAgent)), delegateToReducer(action))(state);
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
      const nodes = itemsToNodes(state.items);
      const path = findPath(itemToNode(getAgent(state)), itemToNode(getTarget(getAgent)(state)), nodes);
      const moveAgent = (s) => updateItem(move(getAgent(s), path[1]))(s);
      return pipe(moveAgent, delegateToReducer(makePath(getAgent)), postAction(action))(state);
    }
    case MAKE_PATH: {
      const {getAgent, getTarget, condition} = payload;
      if (condition(getAgent)(state)) {
        const target = getTarget(getAgent)(state);
        //TODO ensure that visited always exists instead of null check
        const visited = target.visited ? [...target.visited, state.turn] : [state.turn];
        const type = visited.length > 3 ? PATH : target.type;
        return updateItem({...target, visited, type})(state);
      }
      return state;
    }
    case BUILD_FARM: {
      return createBuilding(payload.getAgent, FARM, postAction(action)(state));
    }
    case BUILD_WAREHOUSE: {
      return createBuilding(payload.getAgent, WAREHOUSE, postAction(action)(state));
    }
    case PLANT_CROP: {
      return createBuilding(payload.getAgent, PLANTED, postAction(action)(state));
    }
    case HARVEST_CROP: {
      const agent = payload.getAgent(state);
      const target = getItemByXYAndType(state.items)(agent)(CROP);
      const addedResourceState = updateItemById({
        ...agent,
        resources: [...agent.resources, CROP]
      }, state);
      return createBuildingOn(payload.getAgent)(GRASS)(target.id)(postAction(action)(addedResourceState));
    }
    case LOAD_RESOURCE: {
      const agent = payload.getAgent(state);
      const getByType = getItemByXYAndType(state.items)(agent);
      const target = getByType(FARM) || getByType(WAREHOUSE);
      const resource = target.resources[0];
      const updatedAgent = {...agent, resources: [...agent.resources, resource]};
      const updatedTarget = {...target, resources: target.resources.slice(1)};

      return pipe(updateItem(updatedAgent), updateItem(updatedTarget), postAction(action))(state);
    }
    case UNLOAD_RESOURCE: {
      const agent = payload.getAgent(state);
      const getByType = getItemByXYAndType(state.items)(agent);
      const target = getByType(FARM) || getByType(WAREHOUSE);
      const resource = agent.resources[0];
      const updatedTarget = {...target, resources: [...target.resources, resource]};
      const updatedAgent = {...agent, resources: agent.resources.slice(1)};
      if (isHome(target)(agent)) {
        const event = {...createEvent(RESOURCE_PICKUP)(target.id)(state.turn), resource};
        return pipe(updateItem(updatedAgent), updateItem(updatedTarget), publishEvents([event]), postAction(action))(state);
      }
      return pipe(updateItem(updatedAgent), updateItem(updatedTarget), postAction(action))(state);
    }
    case TRAIN_EVENT: {
      const {getAgent, event} = payload;
      const agent = getAgent(state);
      return updateItemById({
        ...agent,
        behaviorTraining: {
          name: agent.behaviorName,
          eventType: event.type,
          event,
          conditionalActions: []
        },
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
      const activeEvent = agent.events.length > 0 ? agent.events[0] : {type: DEFAULT_EVENT};
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
      if (activeEvent.type === DEFAULT_EVENT && !getNextAction(getAgent)(state)(unitActions)) {
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
      return pipe(updateItem({
        ...agent,
        activeEvent: {type: SLEEPING},
        conditionalActions: [action]
      }), consumeAp(action))(state)
    }
    default:
      return state;
  }
};
