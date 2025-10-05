import { world, system } from '@minecraft/server';
import { throttle, raycastBlock } from './constants.js';
import { debugState, debugData } from './debugForms.js';

// 注册命令
let MAX_DISTANCE;
system.beforeEvents.startup.subscribe((ev) => {
  const commandRegistrar = ev.customCommandRegistry;

  commandRegistrar.registerCommand(
    {
      name: 'ds:setmaxdist',
      description: 'commands.ds.setmaxdist.description',
      permissionLevel: 3,
      optionalParameters: [{ name: 'maxDistance', type: 'Float' }]
    },
    (_, maxDistance) => {
      if (maxDistance === void 0) {
        MAX_DISTANCE = void 0;
        return {
          message: 'commands.ds.setmaxdist.toDefault.success',
          status: 0
        };
      }
      if (maxDistance < 1 || maxDistance > 128) {
        return {
          message: 'commands.ds.setmaxdist.failure',
          status: 1
        };
      }

      MAX_DISTANCE = maxDistance;
      world.sendMessage({
        translate: 'commands.ds.setmaxdist.success',
        with: [String(maxDistance)]
      });
      return {
        status: 0
      };
    }
  );
});

const startDebug = throttle((player) => {
  const block = raycastBlock(
    player.getHeadLocation(),
    player.getRotation(),
    player.dimension,
    MAX_DISTANCE ?? (player.getGameMode() === 'Creative' ? 11.5 : 6.25)
  );

  if (!block) return;
  if (player.isSneaking) {
    debugData(block, player);
  } else {
    debugState(block, player);
  }
}, 5);

// 注册事件监听器
world.beforeEvents.itemUse.subscribe((ev) => {
  const { itemStack: item, source: player } = ev;
  if (item?.typeId !== 'ds:debug_stick') return;
  ev.cancel = true;

  startDebug(player);
});
world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
  const { itemStack: item, player } = ev;
  if (item?.typeId !== 'ds:debug_stick') return;
  ev.cancel = true;

  startDebug(player);
});
