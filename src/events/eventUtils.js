import {selectEventBehavior} from "../reducer";

export const hasBehaviorForEvent = item => event => state => {
  const behavior = selectEventBehavior(item.behaviorName)(event.type)(state);
  return !!behavior.length;
};

export const isEventVisible = agentId => event => !event.local || agentId === event.agentId;
