import reducer, {
  attack,
  autoAction,
  buildFarm,
  endTurn,
  finishTrainEventBehavior,
  harvestCrop,
  moveTowardTarget,
  plantCrop,
  restart,
  selectItemById,
  setActiveEvent,
  setSelectedItem,
  setUnitBehaviorAction,
  trainEventBehavior,
  unloadResource
} from "./reducer";
import {findItemByType, getItemById} from "./itemsUtil";
import {PLAYERS} from "./stateGenerator";

describe('reducer', () => {
  const dAgent = {
    id: 0,
    type: 'x',
    playerId: 'human',
    ap: 1,
    x: 0,
    y: 0,
    hp: 5,
    behaviorName: 'farmer',
    resources: [],
    conditionalActions: [],
    events: [],
  };
  const dTarget = {
    id: 1,
    type: 'o',
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
  const getTarget = selectItemById(dTarget.id);
  const truthy = () => true;

  const fakeConditionalActions = [
    {action: {type: 'TEST_ACTION', payload: {condition: truthy}}, condition: truthy}
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
      const uTarget = getTarget(uState);
      expect(uAgent.ap).toBe(0);
      expect(uTarget.hp).toBe(4);
    });
    it('should do nothing if target not in range', () => {
      const state = {items: [dAgent, {...dTarget, y: 2}]};
      const uState = reducer(state, attack(getAgent)(getTarget));
      const uAgent = getAgent(uState);
      const uTarget = getTarget(uState);
      expect(uAgent.ap).toBe(1);
      expect(uTarget.hp).toBe(5);
    });
  });
  describe('AUTO_ACTION', () => {
    const invalidId = 13;
    const validId = 99;
    const conditionalActionSelect = id => conditionOutcome => {
      return {action: setSelectedItem(id), condition: () => conditionOutcome}
    };

    const validConditionalActionSelect = () => conditionalActionSelect(validId)(true);
    const invalidConditionalActionSelect = () => conditionalActionSelect(invalidId)(false);

    it('should perform next action', () => {
      const agent = {
        ...dAgent,
        conditionalActions: [
          validConditionalActionSelect(),
        ]
      };
      const uState = reducer({items: [agent]}, autoAction(getAgent));
      expect(uState.selectedId).toBe(validId);
    });
    it('should skip invalid actions', () => {
      const agent = {
        ...dAgent,
        conditionalActions: [invalidConditionalActionSelect(), validConditionalActionSelect()]
      };
      const uState = reducer({items: [agent]}, autoAction(getAgent));
      expect(uState.selectedId).toBe(validId);
    });
    it('should perform action from next event if no valid actions', () => {
      const uState = reducer(dState, setUnitBehaviorAction(getAgent));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', 'SLEEPING');
    });
  });
  describe('BUILD_FARM', () => {
    it('should build farm', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: 'grass'}]};
      const uState = reducer(state, buildFarm(getAgent));
      expect(findItemByType(uState.items)('farm')).toHaveProperty('builderId', agentId);
    });
    it('should consume ap', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: 'grass'}]};
      const uState = reducer(state, buildFarm(getAgent));
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
      expect(getAgent(uState)).toHaveProperty('ap', 1);
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
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: 'crop'}]};
      const uState = reducer(state, harvestCrop(getAgent));
      expect(findItemByType(uState.items)('crop')).toBe(undefined);
      expect(getAgent(uState)).toHaveProperty('resources', ['crop']);
    });
  });
  describe('MOVE', () => {
    it('should move right', () => {
      const uState = reducer(dState, moveTowardTarget(getAgent)(getTarget));
      expect(getAgent(uState)).toHaveProperty('y', 1)
    });
  });
  describe('PLANT_CROP', () => {
    it('should plant crop', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: 'grass'}]};
      const uState = reducer(state, plantCrop(getAgent));
      expect(findItemByType(uState.items)('planted')).toHaveProperty('builderId', agentId);
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
      const behaviors = fakeBehavior('DEFAULT_EVENT');
      const state = {...dState, behaviors};
      const uState = reducer(state, setUnitBehaviorAction(getAgent));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', 'DEFAULT_EVENT');
    });
    it('should set SLEEPING event if default behavior', () => {
      const uState = reducer(dState, setUnitBehaviorAction(getAgent));
      expect(getAgent(uState)).toHaveProperty('activeEvent.type', 'SLEEPING');
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
    it('should unload resource from agent to home', () => {
      const state = {
        ...dState,
        items: [
          {...dAgent, resources: ['crop']},
          {
            ...dAgent,
            id: 99,
            builderId: dAgent.id,
            type: 'farm',
            resources: []
          }]
      };

      const uState = reducer(state, unloadResource(getAgent));
      expect(getItemById(99, uState.items)).toHaveProperty('resources', ['crop']);
      expect(getAgent(uState)).toHaveProperty('resources', []);
    });
  });

});