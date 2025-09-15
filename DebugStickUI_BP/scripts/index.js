import { world, system, BlockStates } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';

const arrMin = (arr) => Math.min.apply(null, arr);
const arrMax = (arr) => Math.max.apply(null, arr);

const isBooleanState = (validValues) => {
  return validValues.every((validValue) => typeof validValue === 'boolean');
};

const isRangeState = (validValues) => {
  if (validValues.length === 0) return false;
  if (validValues.some((validValue) => typeof validValue !== 'number'))
    return false;

  const min = arrMin(validValues);
  const max = arrMax(validValues);

  // 连续整数序列的长度应该等于 (max - min + 1)
  return max - min + 1 === validValues.length;
};

const throttle = (fn, delayInTicks) => {
  let lastTick = 0; // 存储上次执行的游戏刻
  let runId = null; // 存储 system.runTimeout 的 ID

  return (...args) => {
    const currentTick = system.currentTick;
    const elapsedTicks = currentTick - lastTick;
    const remainingTicks = delayInTicks - elapsedTicks;

    if (remainingTicks <= 0) {
      if (runId !== null) {
        system.clearRun(runId);
        runId = null;
      }
      lastTick = currentTick;
      fn(...args);
    } else if (runId === null) {
      runId = system.runTimeout(() => {
        lastTick = system.currentTick;
        runId = null;
        fn(...args);
      }, remainingTicks);
    }
  };
};

const setState = (block, state, value) =>
  block.setPermutation(block.permutation.withState(state, value));

const startDebug = (ev, above) => {
  let { block, itemStack: item, player } = ev;
  if (item?.typeId !== 'ds:debug_stick') return;

  ev.cancel = true;
  if (above) {
    block = block.above();
  }

  const form = new ModalFormData()
    .title({ translate: 'gui.debugStickUI.title' })
    .header(block.typeId)
    .divider()
    .label({
      translate: 'gui.debugStickUI.blockName',
      with: { rawtext: [{ translate: block.localizationKey }] }
    })
    .label({
      translate: 'gui.debugStickUI.position',
      with: [block.x, block.y, block.z].map(String)
    })
    .label({
      translate: 'gui.debugStickUI.redstonePower',
      with:
        block.getRedstonePower() !== void 0
          ? [String(block.getRedstonePower())]
          : { rawtext: [{ translate: 'gui.debugStickUI.unpowerable' }] }
    });

  const tags = block.getTags();
  if (tags.length) {
    form.label({ translate: 'gui.debugStickUI.blockTags' });
    for (const tag of tags) {
      form.label(`    §d#${tag}§r`);
    }
  }
  form.divider();

  const canWaterlog = block.canContainLiquid('Water');
  const states = Object.entries(block.permutation.getAllStates());
  const enumStates = {};
  if (canWaterlog) {
    form.toggle('waterlogged', { defaultValue: block.isWaterlogged });
  }
  states.forEach(([state, value], i) => {
    const validValues = BlockStates.get(state).validValues;

    if (isBooleanState(validValues)) {
      form.toggle(state, { defaultValue: value });
    } else if (isRangeState(validValues)) {
      form.slider(state, arrMin(validValues), arrMax(validValues), {
        defaultValue: value
      });
    } else {
      form.dropdown(state, validValues, {
        defaultValueIndex: validValues.indexOf(value)
      });
      enumStates[i] = validValues;
    }
  });

  system.run(() => {
    form
      .submitButton({ translate: 'gui.done' })
      .show(player)
      .then((resp) => {
        if (resp.canceled) return;

        const newValues = resp.formValues.filter((v) => v !== void 0);
        if (canWaterlog) {
          block.setWaterlogged(newValues.shift());
        }
        newValues.forEach((newValue, i) => {
          const state = states[i][0];
          if (Object.hasOwnProperty.call(enumStates, i)) {
            setState(block, state, enumStates[i][newValue]);
          } else {
            setState(block, state, newValue);
          }
        });
      });
  });
};

world.beforeEvents.playerInteractWithBlock.subscribe(throttle(startDebug, 5));
world.beforeEvents.playerBreakBlock.subscribe(
  throttle((ev) => startDebug(ev, true), 5)
);
