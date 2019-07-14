import {generateId, generateState, PLAYERS} from "./stateGenerator";
import {
  getItemById,
  getItemByXYAndType,
  getItemsByPlayer,
  inRange,
  isPlayer,
  removeItemById,
  replaceItems,
  updateItemById,
  updateItems
} from "./itemsUtil";
import {move, toward} from "./movement";

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
  } else {
    const index = selectedItem.conditionalActions.findIndex(conditionalAction => conditionalAction.action.type === action.type);
    if (index > 0) {
      selectedItem.conditionalActions = selectedItem.conditionalActions.slice(index);
    }
  }
  return updateItemById(selectedItem, state);
};

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

const setUnitBehaviorAction = getAgent => ({
  type: 'SET_UNIT_BEHAVIOR',
  payload: {
    getAgent,
  }
});

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
    case 'AUTO_ACTION': {
      const {getAgent} = payload;
      const agent = getAgent(state);
      console.log(agent);
      const nextAction = getNextAction(state)(agent.conditionalActions);
      //TODO unclear order of execution.
      return nextAction ? reducer(state, nextAction.action) : reducer(reducer(state, setUnitBehaviorAction(getAgent)), action);
    }
    case 'RESTART': {
      const behaviors = state.behaviors;
      return {...generateState(), behaviors};
    }
    case 'SET_SELECTED': {
      return {...state, selectedId: payload};
    }
    case 'ATTACK': {
      const {getAgent, getTarget} = payload;
      const consumedState = consumeAp(action, state);
      const attacker = getAgent(consumedState);
      const target = getTarget(consumedState);
      if (inRange(attacker, target)) {
        console.log('target in range!');
        return updateItemById({...target, hp: target.hp - 1}, consumedState);
      } else {
        console.log('target not in range!');
        return updateItemById(move(attacker, toward(target)), consumedState);
      }
    }
    case 'MOVE': {
      const {getAgent, getTarget} = payload;
      const consumedState = consumeAp(action, state);
      const agent = getAgent(consumedState);
      const target = getTarget(consumedState);
      return updateItemById(move(agent, toward(target)), consumedState);
    }
    case 'BUILD_FARM': {
      return createBuilding(payload.agentId, 'farm', consumeAp(action, state));
    }
    case 'PLANT_CROP': {
      return createBuilding(payload.agentId, 'planted', consumeAp(action, state));
    }
    case 'HARVEST_CROP': {
      const agent = payload.getAgent(state);
      const target = getItemByXYAndType(state.items)(agent)('crop');
      return createBuildingOn(agent.id)('grass')(target.id)(consumeAp(action, state));
    }
    case 'TRAIN_EVENT': {
      const {agentId, event} = payload;
      return updateItemById({
        id: agentId,
        behaviorTraining: {name: 'farmer', eventType: event.type, event, conditionalActions: []},
        training: true,
      }, state);
    }
    case 'FINISH_TRAIN_EVENT': {
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
    case 'SET_ACTIVE_EVENT' : {
      const {event, getAgent} = payload;
      const agent = getAgent(state);
      return updateItemById({...agent, activeEvent: event}, state);
    }
    case 'SET_UNIT_BEHAVIOR': {
      //TODO call SET_ACTIVE_EVENT or refactor
      const agent = payload.getAgent(state);
      const activeEvent = agent.events.length > 0 ? agent.events[0] : {type: 'DEFAULT_EVENT'};
      const conditionalActions = selectEventBehavior(agent.behaviorName)(activeEvent.type)(state);
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
