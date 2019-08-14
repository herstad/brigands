import React, {useContext} from 'react';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import {ReducerDispatch} from "./App";
import {setSelectedItem} from "./reducer";
import {
  CROP,
  DEAD,
  ENEMY,
  FARM,
  GRASS,
  HUMAN,
  MOUNTED,
  PATH,
  PLANTED,
  ROCK,
  TREE,
  WAREHOUSE,
  WATER
} from "./itemTypes";

const typeIcons = {
  [HUMAN]: 'android',
  [ENEMY]: 'directions_walk',
  [MOUNTED]: 'direction_bike',
  [GRASS]: 'crop_free',
  [TREE]: 'nature',
  [WATER]: 'waves',
  [ROCK]: 'landscape',
  [DEAD]: 'airline_seat_flat',
  [FARM]: 'home',
  [CROP]: 'local_florist',
  [PLANTED]: 'minimize',
  [WAREHOUSE]: 'layers',
  [PATH]: 'grain',

};

const getIcon = (elem) => elem.hp < 1 ? typeIcons[DEAD] : typeIcons[elem.type] || typeIcons[GRASS];

const createMatrix = (n = 10, items) => {
  let matrix = [];
  for (let y = 0; y < n; y++) {
    matrix[y] = [];
    for (let x = 0; x < n; x++) {
      matrix[y][x] = createAtPosition(items, x, y);
    }
  }
  return matrix;
};

const createAtPosition = (items = [], x, y) => {
  return items.find((item) => item.x === x && item.y === y) || {x: x, y: y, type: '.'}
};

function PlayingFieldCell({elem}) {
  const {dispatch} = useContext(ReducerDispatch);
  const handleSetSelected = (id) => () => {
    dispatch(setSelectedItem(id));
  };
  return (
    <TableCell>
      <IconButton
        onClick={handleSetSelected(elem.id)}><Icon>{getIcon(elem)}</Icon></IconButton>
    </TableCell>);
}

export default function PlayingField() {
  const {items} = useContext(ReducerDispatch).state;
  const matrix = createMatrix(10, items);
  return <div className="PlayingField">
    <Table padding="none">
      <TableBody>
        {
          (matrix.map(row =>
            <TableRow key={row[0].y}>{
              row.map(elem => <PlayingFieldCell key={'x' + elem.x + 'y' + elem.y} elem={elem}/>)}
            </TableRow>))
        }
      </TableBody>
    </Table>
  </div>;
}
