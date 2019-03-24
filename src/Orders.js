import React, {Component} from 'react';
import BrigandContext from "./BrigandContext";

class Orders extends Component {

  render() {
    return <div>
      <BrigandContext.Consumer>
        {({addOne, count}) => {
          return (
            <button onClick={addOne}>Turn: {count}</button>
          )
        }}
      </BrigandContext.Consumer>
      <BrigandContext.Consumer>
        {({moveTowardEnemy}) => {
          return (
            <button onClick={moveTowardEnemy}>MoveTowardEnemy</button>
          )
        }}
      </BrigandContext.Consumer>
      <BrigandContext.Consumer>
        {({moveAwayFromEnemy}) => {
          return (
            <button onClick={moveAwayFromEnemy}>MoveAwayFromEnemy</button>
          )
        }}
      </BrigandContext.Consumer>
      <BrigandContext.Consumer>
        {({attack, inRange, items}) => {
          return (inRange(items[0], items[1]) ? <button onClick={attack}>Attack!</button> : undefined)
        }}
      </BrigandContext.Consumer>
    </div>
  }
}

export default Orders;