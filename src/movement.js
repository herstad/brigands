export const toward = target => mover => {
  const xd = target.x - mover.x;
  const yd = target.y - mover.y;
  return Math.abs(xd) > Math.abs(yd) ? {x: Math.sign(xd), y: 0} : {x: 0, y: Math.sign(yd)};
};

export const move = (mover, nextNode) => {
  const {x, y, gCost} = nextNode;
  return {...mover, ap: (mover.ap - gCost), x, y}
};

export const calculateDistance = agent => target => Math.abs(agent.x - target.x) + Math.abs(agent.y - target.y);

export const compareDistance = agent => (firstEl, secondEl) => {
  const distance = calculateDistance(agent);
  return distance(firstEl) - distance(secondEl);
};