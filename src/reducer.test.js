import reducer, {
  attack,
  autoAction,
  buildFarm,
  buildWarehouse,
  endTurn,
  finishTrainEventBehavior,
  harvestCrop,
  loadResource,
  makePath,
  moveTowardTarget,
  plantCrop,
  restart,
  selectItemById,
  setActiveEvent,
  setSelectedItem,
  setUnitBehaviorAction,
  sleepOneTurn,
  trainEventBehavior,
  unloadResource
} from "./reducer";
import {findItemByType, getItemById} from "./itemsUtil";
import {PLAYERS} from "./stateGenerator";
import {CROP, FARM, GRASS, HUMAN, PATH, PLANTED, PLAYER2, TREE, WAREHOUSE} from "./itemTypes";
import {DEFAULT_EVENT, SLEEPING} from "./events/eventTypes";

describe('reducer', () => {
  const dAgent = {
    id: 0,
    type: HUMAN,
    playerId: 'human',
    ap: 10,
    x: 0,
    y: 0,
    hp: 5,
    behaviorName: 'farmer',
    resources: [],
    conditionalActions: [],
    events: [],
  };
  const dTarget = {
    id: 10,
    type: PLAYER2,
    playerId: 'ai',
    ap: 1,
    x: 0,
    y: 1,
    hp: 5,
    behaviorName: 'farmer',
    resources: [],
    conditionalActions: [],
    events: [],
  };
  const dState = {
    items: [dAgent, dTarget],
    behaviors: {},
    events: [],
    activePlayerId: PLAYERS[0],
    turn: 0
  };
  const agentId = dAgent.id;
  const getAgent = selectItemById(dAgent.id);
  const getTarget = () => selectItemById(dTarget.id);
  const truthy = () => () => true;

  const fakeConditionalActions = [
    {type: 'TEST_ACTION', payload: {condition: truthy}}
  ];

  const fakeBehavior = eventType => ({
    farmer: {
      [eventType]: {
        conditionalActions: fakeConditionalActions,
      }
    }
  });

  const fakeBehaviorTraining = eventType => ({
    name: 'farmer',
    eventType,
    conditionalActions: fakeConditionalActions,
  });

  it('should return same state', () => {
    const state = {noChange: true};
    expect(reducer(state, {type: 'NO_MATCH'})).toBe(state);
  });

  describe('ATTACK', () => {
    it('should reduce hp of target', () => {
      const uState = reducer(dState, attack(getAgent)(getTarget));
      const uAgent = getAgent(uState);
      const uTarget = getTarget()(uState);
      expect(uAgent.ap).toBe(0);
      expect(uTarget.hp).toBe(4);
    });
    it('should do nothing if target not in range', () => {
      const state = {items: [dAgent, {...dTarget, y: 2}]};
      const uState = reducer(state, attack(getAgent)(getTarget));
      const uAgent = getAgent(uState);
      const uTarget = getTarget()(uState);
      expect(uAgent.ap).toBe(10);
      expect(uTarget.hp).toBe(5);
    });
  });
  describe('AUTO_ACTION', () => {
    const invalidTurn = -1;
    const validTurn = 0;

    const validConditionalActionSleep = () => sleepOneTurn(getAgent)(validTurn);
    const invalidConditionalActionSleep = () => sleepOneTurn(getAgent)(invalidTurn);

    it('should perform next action', () => {
      const agent = {
        ...dAgent,
        conditionalActions: [
          validConditionalActionSleep(),
        ]
      };
      const uState = reducer({...dState, items: [agent]}, autoAction(getAgent));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', SLEEPING);
    });
    it('should skip invalid actions', () => {
      const agent = {
        ...dAgent,
        conditionalActions: [invalidConditionalActionSleep(), validConditionalActionSleep()]
      };
      const uState = reducer({...dState, items: [agent]}, autoAction(getAgent));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', SLEEPING);
    });
    it('should perform action from next event if no valid actions', () => {
      const uState = reducer(dState, setUnitBehaviorAction(getAgent));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', SLEEPING);
    });
  });
  describe('BUILD_FARM', () => {
    it('should build farm', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: GRASS}]};
      const uState = reducer(state, buildFarm(getAgent));
      expect(findItemByType(uState.items)(FARM)).toHaveProperty('builderId', agentId);
    });
    it('should consume ap', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: GRASS}]};
      const uState = reducer(state, buildFarm(getAgent));
      expect(getAgent(uState)).toHaveProperty('ap', 0);
    });
  });
  describe('BUILD_WAREHOUSE', () => {
    it('should build warehouse', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: GRASS}]};
      const uState = reducer(state, buildWarehouse(getAgent));
      expect(findItemByType(uState.items)(WAREHOUSE)).toHaveProperty('builderId', agentId);
    });
    it('should consume ap', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: GRASS}]};
      const uState = reducer(state, buildWarehouse(getAgent));
      expect(getAgent(uState)).toHaveProperty('ap', 0);
    });
  });
  describe('END_TURN', () => {
    it('should change active player', () => {
      const uState = reducer(dState, endTurn());
      expect(uState).toHaveProperty('activePlayerId', PLAYERS[1])
    });
    it('should increment turn if last player', () => {
      const state = {...dState, activePlayerId: PLAYERS[PLAYERS.length - 1]};
      const uState = reducer(state, endTurn());
      expect(uState).toHaveProperty('turn', 1)

    });
    it('should add events to units', () => {
      //TODO
    });
    it('should grow planted crops', () => {
      //TODO
    });
    it('should replenish ap', () => {
      const agent = {...dAgent, ap: 0};
      const state = {...dState, items: [agent]};
      const uState = reducer(state, endTurn());
      expect(getAgent(uState)).toHaveProperty('ap', 10);
    });
  });
  describe('FINISH_TRAIN_EVENT', () => {
    it('should set training to false', () => {
      const behaviorTraining = fakeBehaviorTraining('TEST_FINISH_EVENT');
      const agent = {...dAgent, training: true, behaviorTraining};
      const state = {...dState, items: [agent]};
      const uState = reducer(state, finishTrainEventBehavior(getAgent));
      expect(getAgent(uState)).toHaveProperty('training', false);
      expect(getAgent(uState)).toHaveProperty('behaviorTraining', {});
    });
    it('should add trained behavior to behaviors', () => {
      const behaviorTraining = fakeBehaviorTraining('TEST_FINISH_EVENT');
      const agent = {...dAgent, training: true, behaviorTraining};
      const state = {...dState, items: [agent]};
      const uState = reducer(state, finishTrainEventBehavior(getAgent));
      expect(uState).toHaveProperty('behaviors.farmer.TEST_FINISH_EVENT.conditionalActions', fakeConditionalActions);
    });
  });
  describe('HARVEST_CROP', () => {
    it('should plant crop', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: CROP}]};
      const uState = reducer(state, harvestCrop(getAgent));
      expect(findItemByType(uState.items)(CROP)).toBe(undefined);
      expect(getAgent(uState)).toHaveProperty('resources', [CROP]);
    });
  });
  describe('MOVE', () => {
    it('should move right', () => {
      const uState = reducer(dState, moveTowardTarget(getAgent)(getTarget));
      expect(getAgent(uState)).toHaveProperty('y', 1)
    });
  });
  describe('MAKE_PATH', () => {
    it('should add to visited on GRASS', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: GRASS}]};
      const uState = reducer(state, makePath(getAgent));
      expect(uState.items.find(item => GRASS === item.type)).toHaveProperty('visited', [0]);
    });
    it('should make path on frequently visited GRASS', () => {
      const state = {
        ...dState,
        items: [...dState.items, {...dAgent, id: 99, type: GRASS, visited: [0, 1, 2, 3, 4, 5]}]
      };
      const uState = reducer(state, makePath(getAgent));
      expect(uState.items.find(item => PATH === item.type)).toHaveProperty('visited', [0, 1, 2, 3, 4, 5, 0]);
    });
    it('should not add to visited on TREE', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: TREE}]};
      const uState = reducer(state, makePath(getAgent));
      expect(uState.items.find(item => TREE === item.type)).toHaveProperty('visited', undefined);
    });
  });
  describe('PLANT_CROP', () => {
    it('should plant crop', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: GRASS}]};
      const uState = reducer(state, plantCrop(getAgent));
      expect(findItemByType(uState.items)(PLANTED)).toHaveProperty('builderId', agentId);
    });
  });
  describe('RESTART', () => {
    it('should reset state', () => {
      const uState = reducer({turn: 99}, restart());
      expect(uState).toHaveProperty('turn', 0);
    });
    it('should not reset behavior', () => {
      const behaviors = {farmer: {}};
      const uState = reducer({behaviors}, restart());
      expect(uState).toHaveProperty('behaviors', behaviors);
    });
  });
  describe('SET_ACTIVE_EVENT', () => {
    it('should set active event on agent', () => {
      const event = {type: 'TEST_EVENT'};
      const uState = reducer(dState, setActiveEvent(getAgent)(event));
      expect(getAgent(uState)).toHaveProperty('activeEvent', event);
    });
  });
  describe('SET_SELECTED', () => {
    it('should set selected', () => {
      const uState = reducer(dState, setSelectedItem(99));
      expect(uState.selectedId).toBe(99)
    });
  });
  describe('SET_UNIT_BEHAVIOR', () => {
    it('should set next event', () => {
      const behaviors = fakeBehavior('TEST_EVENT');
      const state = {items: [{...dAgent, events: [{type: 'TEST_EVENT'}]}], behaviors};
      const uState = reducer(state, setUnitBehaviorAction(getAgent));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', 'TEST_EVENT');
    });
    it('should set default event if no events', () => {
      const behaviors = fakeBehavior(DEFAULT_EVENT);
      const state = {...dState, behaviors};
      const uState = reducer(state, setUnitBehaviorAction(getAgent));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', DEFAULT_EVENT);
    });
    it('should set SLEEPING event if default behavior', () => {
      const uState = reducer(dState, setUnitBehaviorAction(getAgent));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', SLEEPING);
    });
  });
  describe('TRAIN_EVENT', () => {
    const event = {type: 'TEST_EVENT'};
    it('should set training=true', () => {
      const uState = reducer(dState, trainEventBehavior(getAgent)(event));
      expect(getAgent(uState)).toHaveProperty('training', true);
    });
    it('should set event on behaviorTraining', () => {
      const uState = reducer(dState, trainEventBehavior(getAgent)(event));
      expect(getAgent(uState)).toHaveProperty('behaviorTraining.event', event);
    });
  });
  describe('UNLOAD_RESOURCE', () => {
    const stateWithBuilding = buildingType => ({
      ...dState,
      items: [
        {...dAgent, resources: [CROP]},
        {
          ...dAgent,
          id: 99,
          builderId: dAgent.id,
          type: buildingType,
          resources: []
        }]
    });
    it('should unload resource from agent to home', () => {
      const state = stateWithBuilding(FARM);
      const uState = reducer(state, unloadResource(getAgent));
      expect(getItemById(99, uState.items)).toHaveProperty('resources', [CROP]);
      expect(getAgent(uState)).toHaveProperty('resources', []);
    });
    it('should unload resource from agent to warehouse', () => {
      const state = stateWithBuilding(WAREHOUSE);
      const uState = reducer(state, unloadResource(getAgent));
      expect(getItemById(99, uState.items)).toHaveProperty('resources', [CROP]);
      expect(getAgent(uState)).toHaveProperty('resources', []);
    });
    it('should publish event unloading to home', () => {
      const state = stateWithBuilding(FARM);
      const uState = reducer(state, unloadResource(getAgent));
      expect(uState).toHaveProperty('events.length', 1)
    });
    it('should not publish event unloading to not home', () => {
      const state = stateWithBuilding(WAREHOUSE);
      const uState = reducer(state, unloadResource(getAgent));
      expect(uState).toHaveProperty('events.length', 0)
    });
  });
  describe('LOAD_RESOURCE', () => {
    const stateWithBuilding = buildingType => ({
      ...dState,
      items: [
        ...dState.items,
        {
          ...dAgent,
          id: 99,
          builderId: dAgent.id,
          type: buildingType,
          resources: [CROP]
        }]
    });
    it('should load resource from home to agent', () => {
      const state = stateWithBuilding(FARM);
      const uState = reducer(state, loadResource(getAgent));
      expect(getItemById(99, uState.items)).toHaveProperty('resources', []);
      expect(getAgent(uState)).toHaveProperty('resources', [CROP]);
    });
    it('should load resource from warehouse to agent', () => {
      const state = stateWithBuilding(WAREHOUSE);
      const uState = reducer(state, loadResource(getAgent));
      expect(getItemById(99, uState.items)).toHaveProperty('resources', []);
      expect(getAgent(uState)).toHaveProperty('resources', [CROP]);
    });
  });
  describe('SLEEP', () => {
    it('should sleep one turn', () => {
      const uState = reducer(dState, sleepOneTurn(getAgent)(0));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', SLEEPING);
    })
  })

});