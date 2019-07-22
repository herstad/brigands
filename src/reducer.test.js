import reducer, {
  ATTACK,
  autoAction,
  selectItemById,
  SET_SELECTED,
  setSelectedItem
} from "./reducer";

describe('reducer', () => {
  const dAgent = {id: 0, ap: 1, x: 0, y: 0, hp: 5};
  const dTarget = {id: 1, ap: 1, x: 0, y: 1, hp: 5};
  const dState = {items: [dAgent, dTarget]};
  const getAgent = selectItemById(dAgent.id);
  const getTarget = selectItemById(dTarget.id);

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
    it('should perform next action', () => {
      const agent = {
        ...dAgent,
        conditionalActions: [{action: setSelectedItem(99), condition: () => true}]
      };
      const uState = reducer({items: [agent]}, autoAction(getAgent));
      expect(uState.selectedId).toBe(99);
    });
  });
  describe('BUILD_FARM', () => {
  });
  describe('END_TURN', () => {
  });
  describe('FINISH_TRAIN_EVENT', () => {
  });
  describe('HARVEST_CROP', () => {
  });
  describe('MOVE', () => {
  });
  describe('PLANT_CROP', () => {
  });
  describe('RESTART', () => {
  });
  describe('SET_ACTIVE_EVENT', () => {
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
  });

});