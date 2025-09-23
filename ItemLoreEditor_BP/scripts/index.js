import { world, system, Player } from '@minecraft/server';

const isRawMsg = (m) => typeof m === 'object';
Player.prototype.sendCommandFeedback = function (msg, error = false) {
  if (error) {
    if (Array.isArray(msg)) {
      msg.unshift('§c');
    } else {
      msg = ['§c', msg];
    }
  }
  if (world.gameRules.sendCommandFeedback) this.sendMessage(msg);
};
Array.prototype.insert = function (index, ...items) {
  this.splice(index, 0, ...items);
  return this;
};

system.beforeEvents.startup.subscribe((ev) => {
  const commandRegistrar = ev.customCommandRegistry;

  commandRegistrar.registerCommand(
    {
      name: 'lore:add',
      description: 'commands.lore.add.description',
      permissionLevel: 2,
      mandatoryParameters: [{ name: 'lore', type: 'String' }]
    },
    (orign, lore) => {
      const player = orign.sourceEntity;
      const item = player.getComponent('equippable').getEquipment('Mainhand');
      const itemLore = item.getLore() ?? [];

      system.run(() => {
        itemLore.push(lore);
        item.setLore([...itemLore]);
        player.getComponent('equippable').setEquipment('Mainhand', item);
        player.sendCommandFeedback({
          translate: 'commands.lore.add.success',
          with: [lore]
        });
      });
    }
  );

  commandRegistrar.registerCommand(
    {
      name: 'lore:insert',
      description: 'commands.lore.insert.description',
      permissionLevel: 2,
      mandatoryParameters: [
        { name: 'lineIndex', type: 'Integer' },
        { name: 'lore', type: 'String' }
      ]
    },
    (orign, lineIndex, lore) => {
      const player = orign.sourceEntity;
      const item = player.getComponent('equippable').getEquipment('Mainhand');
      const itemLore = item.getLore() ?? [];

      if (itemLore.length - 1 < lineIndex) {
        player.sendCommandFeedback(
          {
            translate: 'commands.lore.doesNotExist',
            with: [String(lineIndex)]
          },
          true
        );
        return;
      }

      system.run(() => {
        itemLore.insert(lineIndex, lore);
        item.setLore([...itemLore]);
        player.getComponent('equippable').setEquipment('Mainhand', item);
        player.sendCommandFeedback({
          translate: 'commands.lore.insert.success',
          with: [lore, String(lineIndex)]
        });
      });
    }
  );

  commandRegistrar.registerCommand(
    {
      name: 'lore:set',
      description: 'commands.lore.set.description',
      permissionLevel: 2,
      mandatoryParameters: [
        { name: 'lineIndex', type: 'Integer' },
        { name: 'lore', type: 'String' }
      ]
    },
    (orign, lineIndex, lore) => {
      const player = orign.sourceEntity;
      const item = player.getComponent('equippable').getEquipment('Mainhand');
      const itemLore = item.getLore() ?? [];

      if (itemLore.length - 1 < lineIndex) {
        player.sendCommandFeedback(
          {
            translate: 'commands.lore.doesNotExist',
            with: [String(lineIndex)]
          },
          true
        );
        return;
      }

      system.run(() => {
        itemLore[lineIndex] = lore;
        item.setLore([...itemLore]);
        player.getComponent('equippable').setEquipment('Mainhand', item);
        player.sendCommandFeedback({
          translate: 'commands.lore.set.success',
          with: [String(lineIndex), lore]
        });
      });
    }
  );

  commandRegistrar.registerCommand(
    {
      name: 'lore:remove',
      description: 'commands.lore.remove.description',
      permissionLevel: 2,
      mandatoryParameters: [{ name: 'lineIndex', type: 'Integer' }]
    },
    (orign, lineIndex) => {
      const player = orign.sourceEntity;
      const item = player.getComponent('equippable').getEquipment('Mainhand');
      const itemLore = item.getLore() ?? [];

      if (itemLore.length - 1 < lineIndex) {
        player.sendCommandFeedback(
          {
            translate: 'commands.lore.doesNotExist',
            with: [String(lineIndex)]
          },
          true
        );
        return;
      }

      system.run(() => {
        itemLore.splice(lineIndex, 1);
        item.setLore([...itemLore]);
        player.getComponent('equippable').setEquipment('Mainhand', item);
        player.sendCommandFeedback({
          translate: 'commands.lore.remove.success',
          with: [String(lineIndex)]
        });
      });
    }
  );

  commandRegistrar.registerCommand(
    {
      name: 'lore:removeall',
      description: 'commands.lore.removeall.description',
      permissionLevel: 2
    },
    (orign) => {
      const player = orign.sourceEntity;
      const item = player.getComponent('equippable').getEquipment('Mainhand');

      system.run(() => {
        item.setLore([]);
        player.getComponent('equippable').setEquipment('Mainhand', item);
        player.sendCommandFeedback({
          translate: 'commands.lore.removeall.success'
        });
      });
    }
  );
});
