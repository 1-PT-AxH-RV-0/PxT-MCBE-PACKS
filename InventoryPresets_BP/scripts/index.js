import { world, system, Player, BlockPermutation } from '@minecraft/server';

const vec3ToString = (vec3) => `${vec3.x} ${vec3.y} ${vec3.z}`;

// 获取结构管理器
let structureManager = null;
world.afterEvents.worldLoad.subscribe(() => {
  structureManager = world.structureManager;
});

// 修改原型
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
Array.prototype.insertNewlinesInPlace = function () {
  this.unshift('\n');

  for (let i = 2; i < this.length; i += 2) {
    this.splice(i, 0, '\n');
  }

  return this;
};

// 注册命令
system.beforeEvents.startup.subscribe((ev) => {
  const commandRegistrar = ev.customCommandRegistry;

  commandRegistrar.registerCommand(
    {
      name: 'ip:save',
      description: 'commands.ip.save.description',
      permissionLevel: 2,
      mandatoryParameters: [{ name: 'name', type: 'String' }],
      optionalParameters: [{ name: 'clear', type: 'Boolean' }]
    },
    (orign, name, clear) => {
      // 获取存在的物品栏预设
      const player = orign.sourceEntity;
      const dim = player.dimension;
      const presetNames = new Set(
        JSON.parse(player.getDynamicProperty('presetNames') ?? '[]')
      );
      system.run(() => {
        // 获取玩家背包容器对象与可装备组件
        const playerInvContainer = player.getComponent(
          'minecraft:inventory'
        ).container;
        const playerEquippable = player.getComponent('equippable');
        // 计算箱子坐标
        const chestsOrgin = {
          x: Math.round(player.location.x),
          y: Math.round(player.location.y),
          z: Math.round(player.location.z)
        };
        const otherItemsChestLoc = {
          x: chestsOrgin.x,
          y: chestsOrgin.y + 1,
          z: chestsOrgin.z
        };
        // 保存原方块作为临时结构
        structureManager.createFromWorld(
          'ip:original_blocks',
          dim,
          chestsOrgin,
          otherItemsChestLoc,
          {
            includeEntities: false,
            saveMode: 'Memory'
          }
        );

        // 放置箱子
        dim.setBlockPermutation(chestsOrgin, BlockPermutation.resolve('chest'));
        dim.setBlockPermutation(
          otherItemsChestLoc,
          BlockPermutation.resolve('chest')
        );

        // 获取箱子容器对象
        const invChest = dim.getBlock(chestsOrgin);
        const otherItemsChest = dim.getBlock(otherItemsChestLoc);
        const invChestContainer = invChest.getComponent(
          'minecraft:inventory'
        ).container;
        const otherItemsChestContainer = otherItemsChest.getComponent(
          'minecraft:inventory'
        ).container;

        // 复制背包
        for (let i = 9; i < 36; i++) {
          const item = playerInvContainer.getItem(i);
          invChestContainer.setItem(i - 9, item);
        }
        // 复制快捷栏
        for (let i = 0; i < 9; i++) {
          const item = playerInvContainer.getItem(i);
          otherItemsChestContainer.setItem(i, item);
        }
        // 复制装备
        const head = playerEquippable.getEquipment('Head');
        const chest = playerEquippable.getEquipment('Chest');
        const legs = playerEquippable.getEquipment('Legs');
        const feet = playerEquippable.getEquipment('Feet');
        const offhand = playerEquippable.getEquipment('Offhand');
        otherItemsChestContainer.setItem(9, head);
        otherItemsChestContainer.setItem(10, chest);
        otherItemsChestContainer.setItem(11, legs);
        otherItemsChestContainer.setItem(12, feet);
        otherItemsChestContainer.setItem(13, offhand);
        // 保存箱子
        if (presetNames.has(name))
          structureManager.delete(`ip:${name}_${player.id.replace('-', '_')}`);
        structureManager.createFromWorld(
          `ip:${name}_${player.id.replace('-', '_')}`,
          dim,
          chestsOrgin,
          otherItemsChestLoc,
          {
            includeEntities: false,
            saveMode: 'World'
          }
        );
        // 替换为原方块
        structureManager.place('ip:original_blocks', dim, chestsOrgin);
        // 删除原方块临时结构
        structureManager.delete('ip:original_blocks');

        // 更新属性
        presetNames.add(name);
        player.setDynamicProperty(
          'presetNames',
          JSON.stringify([...presetNames])
        );

        // 清空背包与装备
        if (clear) {
          playerInvContainer.clearAll();
          playerEquippable.setEquipment('Head');
          playerEquippable.setEquipment('Chest');
          playerEquippable.setEquipment('Legs');
          playerEquippable.setEquipment('Feet');
          playerEquippable.setEquipment('Offhand');
        }

        player.sendCommandFeedback({
          translate: `commands.ip.save${clear ? '.clear' : ''}.success`,
          with: [name]
        });
      });
    }
  );

  commandRegistrar.registerCommand(
    {
      name: 'ip:load',
      description: 'commands.ip.load.description',
      permissionLevel: 2,
      mandatoryParameters: [{ name: 'name', type: 'String' }]
    },
    (orign, name) => {
      // 获取存在的物品栏预设
      const player = orign.sourceEntity;
      const dim = player.dimension;
      const presetNames = new Set(
        JSON.parse(player.getDynamicProperty('presetNames') ?? '[]')
      );
      if (!presetNames.has(name)) {
        player.sendCommandFeedback({
          translate: `commands.ip.doesNotExist`,
          with: [name]
        }, true);
        return;
      }

      system.run(() => {
        // 获取玩家背包容器对象与可装备组件
        const playerInvContainer = player.getComponent(
          'minecraft:inventory'
        ).container;
        const playerEquippable = player.getComponent('equippable');
        // 计算箱子坐标
        const chestsOrgin = {
          x: Math.round(player.location.x),
          y: Math.round(player.location.y),
          z: Math.round(player.location.z)
        };
        const otherItemsChestLoc = {
          x: chestsOrgin.x,
          y: chestsOrgin.y + 1,
          z: chestsOrgin.z
        };
        // 保存原方块作为临时结构
        structureManager.createFromWorld(
          'ip:original_blocks',
          dim,
          chestsOrgin,
          otherItemsChestLoc,
          {
            includeEntities: false,
            saveMode: 'Memory'
          }
        );
        // 加载箱子
        structureManager.place(
          `ip:${name}_${player.id.replace('-', '_')}`,
          dim,
          chestsOrgin
        );

        // 获取箱子容器对象
        const invChest = dim.getBlock(chestsOrgin);
        const otherItemsChest = dim.getBlock(otherItemsChestLoc);
        const invChestContainer = invChest.getComponent(
          'minecraft:inventory'
        ).container;
        const otherItemsChestContainer = otherItemsChest.getComponent(
          'minecraft:inventory'
        ).container;

        // 复制进背包
        for (let i = 0; i < 27; i++) {
          const item = invChestContainer.getItem(i);
          playerInvContainer.setItem(i + 9, item);
        }
        // 复制进快捷栏
        for (let i = 0; i < 9; i++) {
          const item = otherItemsChestContainer.getItem(i);
          playerInvContainer.setItem(i, item);
        }
        // 复制进装备槽
        const head = otherItemsChestContainer.getItem(9);
        const chest = otherItemsChestContainer.getItem(10);
        const legs = otherItemsChestContainer.getItem(11);
        const feet = otherItemsChestContainer.getItem(12);
        const offhand = otherItemsChestContainer.getItem(13);
        playerEquippable.setEquipment('Head', head);
        playerEquippable.setEquipment('Chest', chest);
        playerEquippable.setEquipment('Legs', legs);
        playerEquippable.setEquipment('Feet', feet);
        playerEquippable.setEquipment('Offhand', offhand);
        // 替换为原方块
        structureManager.place('ip:original_blocks', dim, chestsOrgin);
        // 删除原方块临时结构
        structureManager.delete('ip:original_blocks');

        player.sendCommandFeedback({
          translate: `commands.ip.load.success`,
          with: [name]
        });
      });
    }
  );

  commandRegistrar.registerCommand(
    {
      name: 'ip:delete',
      description: 'commands.ip.delete.description',
      permissionLevel: 2,
      mandatoryParameters: [{ name: 'name', type: 'String' }]
    },
    (orign, name) => {
      const player = orign.sourceEntity;
      const dim = player.dimension;
      const presetNames = new Set(
        JSON.parse(player.getDynamicProperty('presetNames') ?? '[]')
      );
      if (!presetNames.has(name)) {
        player.sendCommandFeedback({
          translate: `commands.ip.doesNotExist`,
          with: [name]
        }, true);
        return;
      }

      system.run(() => {
        structureManager.delete(`ip:${name}_${player.id.replace('-', '_')}`);
        presetNames.delete(name);
        player.setDynamicProperty(
          'presetNames',
          JSON.stringify([...presetNames])
        );

        player.sendCommandFeedback({
          translate: `commands.ip.delete.success`,
          with: [name]
        });
      });
    }
  );

  commandRegistrar.registerCommand(
    {
      name: 'ip:listall',
      description: 'commands.ip.listall.description',
      permissionLevel: 2
    },
    (orign) => {
      const player = orign.sourceEntity;
      const presetNames = JSON.parse(
        player.getDynamicProperty('presetNames') ?? '[]'
      );
      player.sendCommandFeedback([
        {
          translate: `commands.ip.listall.success`,
          with: [String(presetNames.length)]
        },
        ...presetNames.insertNewlinesInPlace()
      ]);
    }
  );

  commandRegistrar.registerCommand(
    {
      name: 'ip:id',
      description: 'commands.ip.id.description',
      permissionLevel: 2
    },
    (orign) => {
      const player = orign.sourceEntity;

      player.sendCommandFeedback({
        translate: `commands.ip.id.success`,
        with: [player.id]
      });
    }
  );
});
