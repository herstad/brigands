import astar from "astar-algorithm"
import {calculateDistance} from "../movement";
import {CROP, FARM, GRASS, PATH, PLANTED, ROCK, TREE, WAREHOUSE, WATER} from "../itemTypes";

const MINIMUM_GCOST = 5;

const id = ({x, y}) => `x${x}y${y}`;
const equalsNode = node1 => node2 => id(node1) === id(node2);
const getSuccessorsFromNodes = nodes => ({x, y}) => {
  return [
    nodes.get(id({x: x - 1, y: y})),
    nodes.get(id({x: x + 1, y: y})),
    nodes.get(id({x: x, y: y - 1})),
    nodes.get(id({x: x, y: y + 1}))].filter(Boolean);
};
const distance = (nodeA, nodeB) => nodeB.gCost;
const estimate = (nodeA, goal) => {
  const unknownSteps = calculateDistance(nodeA)(goal) - 1;
  return nodeA.gCost + (unknownSteps * MINIMUM_GCOST)
};
const mapEntry = node => [id(node), node];

const nodeMap = nodes => {
  const filtered = new Map();
  nodes.forEach(node => {
    const currentNode = filtered.get(id(node));
    if (!currentNode || node.gCost < currentNode.gCost) {
      const [key, value] = mapEntry(node);
      filtered.set(key, value);
    }
  });
  return filtered;
};

const terrainCosts = {
  [GRASS]: 10,
  [TREE]: 20,
  [PATH]: 5,
  [ROCK]: 50,
  [WATER]: 100,
  [PLANTED]: 10,
  [CROP]: 10,
  [FARM]: 10,
  [WAREHOUSE]: 10,
  'default': 500,
};

export const terrainCost = type => terrainCosts[type] || terrainCosts['default'];

export const itemToNode = ({x, y, type}) => ({x, y, gCost: terrainCost(type)});

export const itemsToNodes = items => items.map(itemToNode);

export const getCallbacks = nodes => goal => ({
  // It should return id / key / hash for a node
  id,
  // It should check: is a node is the goal?
  isGoal: equalsNode(goal),
  // It should return an array of successors / neighbors / children
  getSuccessors: getSuccessorsFromNodes(nodes),
  // g(x). It should return the cost of path between two nodes
  distance,
  // h(x). It should return the cost of path from a node to the goal
  estimate,
});

export default function findPath(start, goal, nodes) {
  const filteredNodes = nodeMap(nodes);
  const source = filteredNodes.get(id(start));
  const target = filteredNodes.get(id(goal));
  return astar(source, target, getCallbacks(filteredNodes)(target))
}