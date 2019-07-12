export const PLAYERS = ['human']; // TODO readd ai bug where ai shares behavior and consumes ap
// export const PLAYERS =  ['human', 'ai'];

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
    defaultValues.push({id: generateId(), type: 'grass'});
  }
  return defaultValues;
};

const generateItems = (size = 10) => {
  const units = [
    {
      id: generateId(),
      hp: 5, type: 'x',
      playerId: 'human',
      ap: 1,
      behaviorName: 'farmer',
      conditionalActions: [],
      events: [],
    },
    {
      id: generateId(),
      hp: 5,
      type: 'o',
      playerId: 'ai',
      ap: 1,
      behaviorName: 'farmer',
      conditionalActions: [],
      events: [],
    },
  ];

  const items = [
    {id: generateId(), type: 'tree'},
    {id: generateId(), type: 'tree'},
    {id: generateId(), type: 'tree'},
    {id: generateId(), type: 'tree'},
    {id: generateId(), type: 'tree'},
    {id: generateId(), type: 'tree'},
    {id: generateId(), type: 'rock'},
    {id: generateId(), type: 'rock'},
    {id: generateId(), type: 'rock'},
    {id: generateId(), type: 'water'},
    {id: generateId(), type: 'water'},
    {id: generateId(), type: 'water'},
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