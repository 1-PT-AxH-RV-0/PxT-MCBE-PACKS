import { world, system, CustomCommandParamType } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { raycastEntities } from './constants';
import { startDebugEntity } from './debugForms';

// 注册命令
system.beforeEvents.startup.subscribe(e => {
  e.customCommandRegistry.registerCommand(
    {
      name: 'eds:getid',
      description: 'command.eds.getid.description',
      cheatsRequired: false,
      permissionLevel: 0,
      mandatoryParameters: [
        { name: 'target', type: CustomCommandParamType.EntitySelector }
      ]
    },
    (origin, target) => {
      system.run(() => {
        new ModalFormData()
          .textField('', '', { defaultValue: target[0].id })
          .title('')
          .submitButton({ translate: 'gui.close' })
          .show(origin.sourceEntity);
      });
    }
  );
});

// 注册事件监听器
world.beforeEvents.itemUse.subscribe(ev => {
  const { itemStack: item, source: player } = ev;
  if (item?.typeId !== 'eds:entity_debug_stick') return;
  ev.cancel = true;

  let target = null;
  if (player.isSneaking) {
    target = player;
  } else {
    let lastDistance = Infinity;
    player.dimension.getEntities().map(entity => {
      const raycastResult = raycastEntities(
        player.getHeadLocation(),
        player.getViewDirection(),
        entity.getAABB()
      );

      if (
        raycastResult.hit &&
        raycastResult.distance <= lastDistance &&
        entity !== player
      ) {
        target = entity;
        lastDistance = raycastResult.distance;
      }
    });
  }

  if (!target || !target.isValid) return;
  system.run(() => {
    startDebugEntity(player, target);
  });
});
