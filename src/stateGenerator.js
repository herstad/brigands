import {GRASS, HUMAN, PLAYER2, ROCK, TREE, WATER} from "./itemTypes";
import {DEFAULT_EVENT} from "./events/eventTypes";

export const PLAYERS = ['human', 'ai'];

export const generateState = () => {
  console.log("generate state");

  const items = generateItems();
  return {
    turn: 0,
    activePlayerId: PLAYERS[0],
    items,
    selectedId: items[0].id,
    winner: undefined,
    events: [{type: 'ENEMY_SPOTTED', itemId: items[1].id}, {type: 'GAME_STARTED'}],
    behaviors: {},
    training: false,
  };
};

let itemId = 0;

export const generateId = () => {
  itemId++;
  return itemId;
};

const generateDefaultItems = (size) => {
  const defaultValues = [];
  for (let i = 0; i < size; i++) {
    defaultValues.push({id: generateId(), type: GRASS});
  }
  return defaultValues;
};

const generateItems = (size = 10) => {
  const units = [
    {
      id: generateId(),
      hp: 5,
      type: HUMAN,
      playerId: 'human',
      ap: 10,
      behaviorName: 'farmer',
      conditionalActions: [],
      events: [],
      activeEvent: {type: DEFAULT_EVENT},
      resources: [],
    },
    {
      id: generateId(),
      hp: 5,
      type: PLAYER2,
      playerId: 'ai',
      ap: 10,
      behaviorName: 'brigand',
      conditionalActions: [],
      events: [],
      activeEvent: {type: DEFAULT_EVENT},
      resources: [],
    },
    {
      id: generateId(),
      hp: 5,
      type: HUMAN,
      playerId: 'human',
      ap: 10,
      behaviorName: 'farmer',
      conditionalActions: [],
      events: [],
      activeEvent: {type: DEFAULT_EVENT},
      resources: [],
    },
    {
      id: generateId(),
      hp: 5,
      type: HUMAN,
      playerId: 'human',
      ap: 10,
      behaviorName: 'hauler',
      conditionalActions: [],
      events: [],
      activeEvent: {type: DEFAULT_EVENT},
      resources: [],
    },
  ];

  const items = [
    {id: generateId(), type: TREE},
    {id: generateId(), type: TREE},
    {id: generateId(), type: TREE},
    {id: generateId(), type: TREE},
    {id: generateId(), type: TREE},
    {id: generateId(), type: TREE},
    {id: generateId(), type: ROCK},
    {id: generateId(), type: ROCK},
    {id: generateId(), type: ROCK},
    {id: generateId(), type: WATER},
    {id: generateId(), type: WATER},
    {id: generateId(), type: WATER},
  ];

  const genPos = generatePosition(size);
  return genPos(units).concat(genPos(items.concat(generateDefaultItems(size * size - items.length))));
};

const generatePosition = (size) => (items) => {
  const points = generateRandomMatrix(size);
  return items.map((item) => ({...item, ...points.shift()}));
};

const generateRandomMatrix = (size) => {
  const array = Array.from(Array(size).keys());
  const matrix = array.map((x) => {
    return array.map((y) => {
      return {x, y};
    })
  }).flat();
  shuffleArray(matrix);
  return matrix;
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};