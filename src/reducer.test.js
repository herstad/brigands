import reducer, {selectItemById} from "./reducer";

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
      const uState = reducer(dState, {type: 'ATTACK', payload: {getAgent, getTarget}});
      const uAgent = getAgent(uState);
      const uTarget = getTarget(uState);
      expect(uAgent.ap).toBe(0);
      expect(uTarget.hp).toBe(4);
    });
    it('should do nothing if target not in range', () => {
      const state = {items: [dAgent, {...dTarget, y: 2}]};
      const uState = reducer(state, {type: 'ATTACK', payload: {getAgent, getTarget}});
      const uAgent = getAgent(uState);
      const uTarget = getTarget(uState);
      expect(uAgent.ap).toBe(1);
      expect(uTarget.hp).toBe(5);
    });
  });

  describe('SET_SELECTED', () => {
    it('should set selected', () => {
      const uState = reducer(dState, {type: 'SET_SELECTED', payload: 99});
      expect(uState.selectedId).toBe(99)
    });
  });

});