import findPath, {itemsToNodes} from "./findPath";
import {PATH} from "../itemTypes";

describe('findPath', () => {

  const start = {x: 0, y: 0, gCost: 1};
  const goal = {x: 2, y: 2, gCost: 1};

  const shortestPath = [
    {x: 1, y: 0, gCost: 1},
    {x: 2, y: 0, gCost: 1},
    {x: 2, y: 1, gCost: 1},];

  const longestPath = [
    {x: 0, y: 1, gCost: 2},
    {x: 0, y: 2, gCost: 1},
    {x: 1, y: 2, gCost: 1},];

  const nodes =
    [
      start,
      ...longestPath,
      ...shortestPath,
      goal,
    ];
  it('should find a path', () => {
    expect(findPath(start, goal, nodes)).toEqual([start, ...shortestPath, goal]);
  });
  describe('itemsToNodes', () => {
    it('should translate x, y', () => {
      expect(itemsToNodes([{x: 1, y: 2}])).toEqual([{x: 1, y: 2, gCost: 500}]);
    });
    it('should translate type PATH to gCost 5', () => {
      expect(itemsToNodes([{x: 1, y: 2, type: PATH}])).toEqual([{x: 1, y: 2, gCost: 5}]);
    })
  })
});