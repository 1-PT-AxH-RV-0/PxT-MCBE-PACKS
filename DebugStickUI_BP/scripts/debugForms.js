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
import {
  isBooleanState,
  isRangeState,
  arrMin,
  arrMax,
  setState,
  breakBlock,
  getItemIdFromBlock
} from './constants.js';

export const debugState = (block, player) => {
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

export const debugData = (block, player) => {
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
            debugPos(block, player);
            break;
          case 1:
            debugPos(block, player, true);
            break;
          case 2:
            debugId(block, player);
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

const debugPos = (block, player, offset = false) => {
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

const debugId = (block, player) => {
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
