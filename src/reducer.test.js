import reducer, {
  ATTACK,
  autoAction,
  buildFarm,
  harvestCrop,
  moveTowardTarget,
  plantCrop,
  restart,
  selectItemById,
  setActiveEvent,
  setSelectedItem,
  unloadResource
} from "./reducer";
import {findItemByType, getItemById} from "./itemsUtil";

describe('reducer', () => {
  const dAgent = {id: 0, ap: 1, x: 0, y: 0, hp: 5, resources: []};
  const dTarget = {id: 1, ap: 1, x: 0, y: 1, hp: 5, resources: []};
  const dState = {items: [dAgent, dTarget], behaviors: {}};
  const getAgent = selectItemById(dAgent.id);
  const getTarget = selectItemById(dTarget.id);
  const truthy = () => true;

  it('should return same state', () => {
    const state = {noChange: true};
    expect(reducer(state, {type: 'NO_MATCH'})).toBe(state);
  });

  describe('ATTACK', () => {
    it('should reduce hp of target', () => {
      const uState = reducer(dState, {type: ATTACK, payload: {getAgent, getTarget}});
      const uAgent = getAgent(uState);
      const uTarget = getTarget(uState);
      expect(uAgent.ap).toBe(0);
      expect(uTarget.hp).toBe(4);
    });
    it('should do nothing if target not in range', () => {
      const state = {items: [dAgent, {...dTarget, y: 2}]};
      const uState = reducer(state, {type: ATTACK, payload: {getAgent, getTarget}});
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
    it('should set SLEEPING event on no valid actions or events', () => {
      const agent = {
        ...dAgent,
        conditionalActions: [],
        events: [],
      };
      const state = {...dState, items: [agent]};
      const uState = reducer(state, autoAction(getAgent));
      expect(uState.items[0].activeEvent.type).toBe('SLEEPING');
    });
    it('should perform action from next event if no valid actions', () => {
      //TODO create behavior for DEFAULT_EVENT with validConditionalActionSelect
    });
  });
  describe('BUILD_FARM', () => {
    it('should build farm', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: 'grass'}]};
      const agentId = getAgent(state).id;
      const uState = reducer(state, buildFarm(agentId)(truthy));
      expect(findItemByType(uState.items)('farm')).toHaveProperty('builderId', agentId);
    });
  });
  describe('END_TURN', () => {
  });
  describe('FINISH_TRAIN_EVENT', () => {
  });
  describe('HARVEST_CROP', () => {
    it('should plant crop', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: 'crop'}]};
      const uState = reducer(state, harvestCrop(getAgent)(truthy));
      expect(findItemByType(uState.items)('crop')).toBe(undefined);
      expect(getAgent(uState)).toHaveProperty('resources', ['crop']);
    });
  });
  describe('MOVE', () => {
    it('should move right', () => {
      const uState = reducer(dState, moveTowardTarget(getAgent)(getTarget)(truthy));
      expect(getAgent(uState)).toHaveProperty('y', 1)
    });
  });
  describe('PLANT_CROP', () => {
    it('should plant crop', () => {
      const state = {...dState, items: [...dState.items, {...dAgent, id: 99, type: 'grass'}]};
      const agentId = getAgent(state).id;
      const uState = reducer(state, plantCrop(agentId)(truthy));
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
  });
  describe('TRAIN_EVENT', () => {
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

      const uState = reducer(state, unloadResource(getAgent)(truthy));
      expect(getItemById(99, uState.items)).toHaveProperty('resources', ['crop']);
      expect(getAgent(uState)).toHaveProperty('resources', []);
    });
  });

});