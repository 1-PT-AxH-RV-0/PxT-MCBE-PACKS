import {
  world,
  system,
  BlockStates,
  BlockPermutation,
  ItemStack
} from '@minecraft/server';
import {
  ModalFormData,
  ActionFormData,
  MessageFormData
} from '@minecraft/server-ui';

// item. 形式的方块物品
const ITEM_DOT_FORM_BLOCK_IDS = new Set([
  'campfire',
  'brewing_stand',
  'cauldron',
  'flower_pot',
  'soul_campfire',
  'wheat',
  'jungle_door',
  'glow_frame',
  'nether_wart',
  'bed',
  'beetroot',
  'spruce_door',
  'cake',
  'camera',
  'frame',
  'crimson_door',
  'warped_door',
  'acacia_door',
  'dark_oak_door',
  'wooden_door',
  'nether_sprouts',
  'reeds',
  'iron_door',
  'kelp',
  'birch_door',
  'hopper',
  'mangrove_door'
]);

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

const getItemIdFromBlock = (block) => {
  const typeId = block.typeId.replace('minecraft:', '');
  if (ITEM_DOT_FORM_BLOCK_IDS.has(typeId)) {
    return 'item.' + typeId;
  }
  return typeId;
};

const setState = (block, state, value) =>
  block.setPermutation(block.permutation.withState(state, value));

const breakBlock = (block) => {
  block.dimension.runCommand(`setblock ${block.x} ${block.y} ${block.z} air destroy`);
}

const debugState = (block, player) => {
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

const debugData = (block, player) => {
  const debugPos = (offset = false) => {
    const structureManager = world.structureManager;

    if (structureManager.get('ds:air') === void 0) {
      const air = structureManager.createEmpty(
        'ds:air',
        { x: 1, y: 1, z: 1 },
        'World'
      );
      air.setBlockPermutation(
        { x: 0, y: 0, z: 0 },
        BlockPermutation.resolve('minecraft:air')
      );
      air.saveToWorld();
    }

    new ModalFormData()
      .title({
        translate: offset
          ? 'gui.debugStickUI.debugPos.offset'
          : 'gui.debugStickUI.debugPos.set'
      })
      .textField(
        '',
        {
          translate: offset
            ? 'gui.debugStickUI.debugPos.offsetX'
            : 'gui.debugStickUI.debugPos.x'
        },
        { defaultValue: offset ? '' : String(block.x) }
      )
      .textField(
        '',
        {
          translate: offset
            ? 'gui.debugStickUI.debugPos.offsetY'
            : 'gui.debugStickUI.debugPos.y'
        },
        { defaultValue: offset ? '' : String(block.y) }
      )
      .textField(
        '',
        {
          translate: offset
            ? 'gui.debugStickUI.debugPos.offsetZ'
            : 'gui.debugStickUI.debugPos.z'
        },
        { defaultValue: offset ? '' : String(block.z) }
      )
      .submitButton({ translate: 'gui.done' })
      .show(player)
      .then(async (resp) => {
        if (resp.canceled) return;

        const { formValues } = resp;
        if (formValues.some(isNaN)) {
          new MessageFormData()
            .title({ translate: 'gui.error' })
            .body({ translate: 'gui.debugStickUI.error.notNumber' })
            .button1({ translate: 'gui.confirm' })
            .button2({ translate: 'gui.confirm' })
            .show(player);
          return;
        }
        const targetPos = {
          x: (offset ? block.x : 0) + Number(formValues[0]),
          y: (offset ? block.y : 0) + Number(formValues[1]),
          z: (offset ? block.z : 0) + Number(formValues[2])
        };

        const heightRange = player.dimension.heightRange;
        if (
          targetPos.y < heightRange.min ||
          targetPos.y > heightRange.max ||
          !player.dimension.getBlock(targetPos)
        ) {
          new MessageFormData()
            .title({ translate: 'gui.error' })
            .body({ translate: 'gui.debugStickUI.error.invalidPosition' })
            .button1({ translate: 'gui.confirm' })
            .button2({ translate: 'gui.confirm' })
            .show(player);
          return;
        } else if (!player.dimension.getBlock(targetPos).isAir) {
          const resp = await new MessageFormData()
            .title({ translate: 'gui.warning' })
            .body({ translate: 'gui.debugStickUI.warning.overwrite' })
            .button1({ translate: 'gui.confirm' })
            .button2({ translate: 'gui.cancel' })
            .show(player);
          if (resp.canceled || resp.selection === 1) return;
        }

        structureManager.createFromWorld(
          'ds:block',
          player.dimension,
          block.location,
          block.location,
          {
            includeEntities: false,
            saveMode: 'Memory'
          }
        );
        structureManager.place('ds:air', player.dimension, block.location);
        structureManager.place('ds:block', player.dimension, targetPos);
        structureManager.delete('ds:block');
      });
  };

  const debugId = () => {
    new ModalFormData()
      .title({ translate: 'gui.debugStickUI.debugId.set' })
      .textField({ translate: 'gui.debugStickUI.debugId.id' }, '', {
        defaultValue: block.typeId
      })
      .submitButton({ translate: 'gui.done' })
      .show(player)
      .then((resp) => {
        if (resp.canceled) return;

        const { formValues } = resp;
        try {
          block.setType(formValues[0]);
        } catch {
          new MessageFormData()
            .title({ translate: 'gui.error' })
            .body({ translate: 'gui.debugStickUI.error.invalidBlockId' })
            .button1({ translate: 'gui.confirm' })
            .button2({ translate: 'gui.confirm' })
            .show(player);
        }
      });
  };

  system.run(() => {
    new ActionFormData()
      .title({ translate: 'gui.debugStickUI.ops.title' })
      .button({ translate: 'gui.debugStickUI.ops.modifyPosition' })
      .button({ translate: 'gui.debugStickUI.ops.modifyPositionOffset' })
      .button({ translate: 'gui.debugStickUI.ops.modifyId' })
      .button({ translate: 'gui.debugStickUI.ops.getItem' })
      .button({ translate: 'gui.debugStickUI.ops.break' })
      .button({ translate: 'gui.debugStickUI.ops.remove' })
      .show(player)
      .then((resp) => {
        if (resp.canceled) return;
        switch (resp.selection) {
          case 0:
            debugPos();
            break;
          case 1:
            debugPos(true);
            break;
          case 2:
            debugId();
            break;
          case 3:
            player
              .getComponent('minecraft:inventory')
              .container.addItem(new ItemStack(getItemIdFromBlock(block)));
            break;
          case 4:
            breakBlock(block);
          case 5:
            block.setType('minecraft:air');
        }
      });
  });
};

const startDebug = (ev, above) => {
  let { block, itemStack: item, player } = ev;
  if (item?.typeId !== 'ds:debug_stick') return;

  ev.cancel = true;
  if (above) {
    block = block.above();
  }

  if (player.isSneaking) {
    debugData(block, player);
  } else {
    debugState(block, player);
  }
};

world.beforeEvents.playerInteractWithBlock.subscribe(throttle(startDebug, 5));
world.beforeEvents.playerBreakBlock.subscribe(
  throttle((ev) => startDebug(ev, true), 5)
);
