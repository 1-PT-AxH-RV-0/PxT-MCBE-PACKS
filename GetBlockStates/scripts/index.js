import { world, BlockPermutation, BlockStates } from '@minecraft/server';
import blockIds from './_blockIds.js';

const record = {};
world.afterEvents.worldLoad.subscribe(() => {
  for (const blockId of blockIds) {
    const blockPerm = BlockPermutation.resolve(blockId);
    const states = Object.keys(blockPerm.getAllStates());

    const statesObj = {};

    for (const state of states) {
      statesObj[state] = BlockStates.get(state).validValues;
    }

    if (states.length) {
      record[blockId] = statesObj;
    }
  }

  console.log(JSON.stringify(record));
});
