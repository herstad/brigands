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
  const clearedItems = removeItemById(target.id, state.items);
  const building = {
    id: generateId(),
    builderId,
    x: builder.x,
    y: builder.y,
    type,
    createdTurn: state.turn,
  };
  return {...state, items: [...clearedItems, building]}
};

const plantedShouldGrow = turn => item => item.type === 'planted' && item.createdTurn + 5 <= turn;

export default (state, action) => {
  console.log('Action');
  console.log(action);
  console.log(state);
  const {payload} = action;
  switch (action.type) {
    case 'END_TURN': {
      const apItems = updateItems((item) => isPlayer(payload, item))({ap: 1})(state.items);
      const grownCrops = apItems.filter(plantedShouldGrow(state.turn));
      const newCrops = updateItems(plantedShouldGrow(state.turn))({type: 'crop',})(grownCrops);
      const items = replaceItems(apItems)(newCrops);
      const events = newCrops.map((item) => ({type: 'CROP_GROWN', itemId: item.id}));
      return {
        ...state,
        items,
        turn: nextTurn(state.turn, state.activePlayerId),
        activePlayerId: nextPlayer(state.activePlayerId),
        winner: getWinner(state),
        events,
      };
    }
    case 'RESTART': {
      return generateState();
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
      const consumedState = consumeAp(action, state);
      const {x, y} = selectItemById(payload.targetId)(state);
      const grass = {
        id: generateId(),
        x,
        y,
        type: 'grass',
      };
      return {
        ...consumedState,
        items: [...removeItemById(payload.targetId, consumedState.items), grass],
      }
    }
    case 'TRAIN_EVENT': {
      const {agentId, event} = payload;
      return updateItemById({
        id: agentId,
        behaviorTraining: {name: 'farmer', eventType: event.type, conditionalActions: []},
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
    default:
      return state;
  }
};
