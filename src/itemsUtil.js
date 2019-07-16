import {PLAYERS} from "./stateGenerator";

export const isPlayer = (playerId, item) => item.playerId === playerId;
export const matchPlayer = (playerId) => (item) => isPlayer(playerId, item);
export const getItemById = (id, items) => items.find((item) => item.id === id);
export const getItemsByPlayer = (playerId, items) => items.filter(matchPlayer(playerId));
export const getItemsByXY = items => ({x, y}) => items.filter((item) => item.x === x && item.y === y);
export const getItemByXYAndType = items => selectedItem => type => findItemByType(getItemsByXY(items)(selectedItem))(type);
export const findItemByType = items => type => items.find(item => item.type === type);
export const removeItemById = (id, items) => items.filter((item) => item.id !== id);
export const getEnemyItems = (state) => {
  const otherPlayers = PLAYERS.filter((player) => state.activePlayerId !== player);
  return otherPlayers.flatMap((otherPlayer) => getItemsByPlayer(otherPlayer, state.items));
};
export const inRange = (attacker, target, range = 1) => {
  return Math.abs(target.x - attacker.x) + Math.abs(target.y - attacker.y) <= range;
};

export const updateItem = updatedItem => state => {
  const items = state.items.map(updateItemByIdFn(updatedItem));
  return ({...state, items});
};

export const updateItemById = (updatedItem, state) => {
  const items = state.items.map(updateItemByIdFn(updatedItem));
  return ({...state, items});
};

export const replaceItems = items => replacements => {
  return items.map(obj => replacements.find(o => o.id === obj.id) || obj);
};

export const updateItems = predicate => updatedItem => items => {
  return items.map(updateItemFn(predicate)(updatedItem));
};

export const updateItemFn = predicate => updatedItem => {
  return el => (predicate(el) ? {...el, ...updatedItem} : el);
};

export const replaceItemFn = predicate => updatedItem => {
  return el => (predicate(el) ? updatedItem : el);
};

export const updateItemByIdFn = (updatedItem) => {
  return updateItemFn(el => updatedItem.id === el.id)(updatedItem);
};

export const matchId = (id) => {
  return (item) => item.id === id;
};