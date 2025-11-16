import {
  world,
  Player,
  EntityComponentTypes,
  EquipmentSlot,
  World,
  EntityDamageCause,
  Entity,
  EntityAttributeComponent
} from '@minecraft/server';
import {
  ActionFormData,
  MessageFormData,
  ModalFormData
} from '@minecraft/server-ui';
import {
  ATTRIBUTE_NAMES,
  EQUIPMENT_SLOTS,
  genActionFormFromInvAndEquip
} from './constants';

Number.prototype.toFixedWithoutZero = function (p) {
  return this.toFixed(p)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
};

World.prototype.getEntitySafe = function (id) {
  try {
    return this.getEntity(id);
  } catch {
    return void 0;
  }
};

/**
 * @param {Player} player
 * @param {Entity} entity
 */
const startDebugEntity = (player, entity) => {
  const openErrorDialog = msg => {
    new MessageFormData()
      .body(msg)
      .title({ translate: 'gui.error' })
      .button1({ translate: 'gui.confirm' })
      .button2({ translate: 'gui.close' })
      .show(player);
  };

  if (!entity || !entity.isValid) {
    openErrorDialog({ translate: 'eds.error.general.entityInvalid' });
    return;
  }

  const getInfo = () => {
    const info = [
      // Type Id
      { translate: 'gui.eds.info.typeId' },
      { text: entity.typeId + '\n' },

      // Localised Name
      { translate: 'gui.eds.info.localisedName' },
      { translate: entity.localizationKey },
      { text: '\n' },

      // ID
      { translate: 'gui.eds.info.id' },
      { text: entity.id + '\n' },

      // Position
      { translate: 'gui.eds.info.position' },
      {
        text: `${entity.location.x.toFixedWithoutZero(5)} ${entity.location.y.toFixedWithoutZero(5)} ${entity.location.z.toFixedWithoutZero(5)}\n`
      },

      // Rotation
      { translate: 'gui.eds.info.rotation' },
      {
        text: `${entity.getRotation().x.toFixedWithoutZero(5)} ${entity.getRotation().y.toFixedWithoutZero(5)}\n`
      },

      // Velocity
      { translate: 'gui.eds.info.velocity' },
      {
        text: `${entity.getVelocity().x.toFixedWithoutZero(5)} ${entity.getVelocity().y.toFixedWithoutZero(5)} ${entity.getVelocity().z.toFixedWithoutZero(5)}\n`
      },

      // Name Tag
      ...(entity.nameTag
        ? [
            { translate: 'gui.eds.info.nameTag' },
            { text: entity.nameTag + '\n' }
          ]
        : []),

      // Player Name & Platform Type & Level
      ...(entity instanceof Player
        ? [
            { translate: 'gui.eds.info.playerName' },
            { text: entity.name + '\n' },
            { translate: 'gui.eds.info.playerPlatformType' },
            { text: entity.clientSystemInfo.platformType + '\n' },
            { translate: 'gui.eds.info.permissionLevel' },
            { text: entity.commandPermissionLevel + '\n' },
            { translate: 'gui.eds.info.level' },
            {
              text: `${entity.level} (${entity.xpEarnedAtCurrentLevel}/${entity.totalXpNeededForNextLevel}, `
            },
            {
              translate: 'gui.eds.percent.format',
              with: [
                (
                  (entity.xpEarnedAtCurrentLevel /
                    entity.totalXpNeededForNextLevel) *
                  100
                ).toFixedWithoutZero(2)
              ]
            },
            {
              text: `, -${entity.totalXpNeededForNextLevel - entity.xpEarnedAtCurrentLevel})\n`
            }
          ]
        : []),

      // Tags
      ...(entity.getTags().length
        ? [
            { translate: 'gui.eds.info.tags' },
            { text: '\n' + entity.getTags().join('\n') + '\n' }
          ]
        : []),

      { text: '\n' }
    ];

    if (entity.hasComponent(EntityComponentTypes.Health)) {
      info.push(
        { translate: 'gui.eds.info.health' },
        {
          text:
            String(
              entity.getComponent(EntityComponentTypes.Health).currentValue
            ) + '\n\n'
        }
      );
    }

    if (entity instanceof Player) {
      info.push(
        { translate: 'gui.eds.info.hungerAndSaturationAndExhaustion' },
        {
          text: `${entity.getComponent(EntityComponentTypes.Hunger)?.currentValue?.toFixedWithoutZero?.(5)} / ${entity.getComponent(EntityComponentTypes.Saturation)?.currentValue?.toFixedWithoutZero?.(5)} / ${entity.getComponent(EntityComponentTypes.Exhaustion)?.currentValue?.toFixedWithoutZero?.(5)}\n\n`
        }
      );
    }

    if (entity.hasComponent(EntityComponentTypes.OnFire)) {
      info.push(
        { translate: 'gui.eds.info.fireTime' },
        {
          translate: 'date.secondsAbbreviated1Char',
          with: [
            (
              entity.getComponent(EntityComponentTypes.OnFire)
                .onFireTicksRemaining / 20
            ).toFixedWithoutZero(2)
          ]
        },
        {
          text: '\n\n'
        }
      );
    }

    if (
      entity.hasComponent(EntityComponentTypes.Movement) &&
      entity.hasComponent(EntityComponentTypes.LavaMovement) &&
      entity.hasComponent(EntityComponentTypes.UnderwaterMovement)
    ) {
      info.push(
        { translate: 'gui.eds.info.movements' },
        {
          text: `${entity.getComponent(EntityComponentTypes.Movement).currentValue.toFixedWithoutZero(5)} / ${entity.getComponent(EntityComponentTypes.LavaMovement).currentValue.toFixedWithoutZero(5)} / ${entity.getComponent(EntityComponentTypes.UnderwaterMovement).currentValue.toFixedWithoutZero(5)}\n\n`
        }
      );
    }

    if (entity.hasComponent(EntityComponentTypes.Item)) {
      info.push(
        { translate: 'gui.eds.info.itemTypeId' },
        {
          text:
            entity.getComponent(EntityComponentTypes.Item).itemStack.typeId +
            '\n'
        },
        { translate: 'gui.eds.info.itemLocalisedName' },
        {
          translate: entity.getComponent(EntityComponentTypes.Item).itemStack
            .localizationKey
        },
        { text: '\n' },
        { translate: 'gui.eds.info.itemAmount' },
        {
          text: entity.getComponent(EntityComponentTypes.Item).itemStack
            .amount + '\n\n'
        }
      );
    }

    if (entity.hasComponent(EntityComponentTypes.TypeFamily)) {
      info.push(
        { translate: 'gui.eds.info.typeFamilies' },
        { text: '\n' },
        {
          text: entity
            .getComponent(EntityComponentTypes.TypeFamily)
            .getTypeFamilies()
            .join('\n')
        },
        { text: '\n\n' }
      );
    }

    const equipComponent = entity.getComponent(EntityComponentTypes.Equippable);
    if (equipComponent) {
      info.push(
        { translate: 'gui.eds.info.armorLevel' },
        { text: equipComponent.totalArmor + '\n' },
        { translate: 'gui.eds.info.toughnessLevel' },
        { text: equipComponent.totalToughness + '\n' },

        { translate: 'gui.eds.info.head' },
        {
          translate:
            equipComponent.getEquipment(EquipmentSlot.Head)?.localizationKey ??
            'gui.eds.info.none'
        },
        { text: '\n' },
        { translate: 'gui.eds.info.chest' },
        {
          translate:
            equipComponent.getEquipment(EquipmentSlot.Chest)?.localizationKey ??
            'gui.eds.info.none'
        },
        { text: '\n' },
        { translate: 'gui.eds.info.legs' },
        {
          translate:
            equipComponent.getEquipment(EquipmentSlot.Legs)?.localizationKey ??
            'gui.eds.info.none'
        },
        { text: '\n' },
        { translate: 'gui.eds.info.feet' },
        {
          translate:
            equipComponent.getEquipment(EquipmentSlot.Feet)?.localizationKey ??
            'gui.eds.info.none'
        },
        { text: '\n' },
        { translate: 'gui.eds.info.mainhand' },
        {
          translate:
            equipComponent.getEquipment(EquipmentSlot.Mainhand)
              ?.localizationKey ?? 'gui.eds.info.none'
        },
        { text: '\n' },
        { translate: 'gui.eds.info.offhand' },
        {
          translate:
            equipComponent.getEquipment(EquipmentSlot.Offhand)
              ?.localizationKey ?? 'gui.eds.info.none'
        },
        { text: '\n\n' }
      );
    }

    const effects = entity.getEffects();
    if (effects.length) {
      info.push({ translate: 'gui.eds.info.effects' }, { text: '\n' });
      for (const effect of effects) {
        info.push(
          { text: `§e${effect.displayName}§r*${effect.amplifier + 1}, ` },
          {
            translate: 'date.secondsAbbreviated1Char',
            with: [effect.duration === -1 ? '∞' : String(effect.duration / 20)]
          },
          { text: '\n' }
        );
      }
      info.push({ text: '\n' });
    }

    new MessageFormData()
      .title({ translate: 'gui.eds.info.title' })
      .body({ rawtext: info })
      .button1({ translate: 'gui.back' })
      .button2({ translate: 'gui.close' })
      .show(player)
      .then(resp => {
        if (resp.canceled) return;
        if (resp.selection === 0 && entity.isValid)
          startDebugEntity(player, entity);
      });
  };

  const tp = () => {
    new ModalFormData()
      .title({ translate: 'gui.eds.tp.title' })
      .textField('X', entity.location.x.toFixedWithoutZero(5))
      .textField('Y', entity.location.y.toFixedWithoutZero(5))
      .textField('Z', entity.location.z.toFixedWithoutZero(5))
      .toggle({ translate: 'gui.eds.tp.offset' })
      .submitButton({ translate: 'gui.done' })
      .show(player)
      .then(resp => {
        if (resp.canceled) return;

        const basePos = resp.formValues[3]
          ? entity.location
          : { x: 0, y: 0, z: 0 };
        const inputPos = {
          x: +resp.formValues[0],
          y: +resp.formValues[1],
          z: +resp.formValues[2]
        };

        if (isNaN(inputPos.x) || isNaN(inputPos.y) || isNaN(inputPos.z)) {
          openErrorDialog({
            translate: 'eds.error.teleport.invalidCoordinates'
          });
          return;
        }

        const targetPos = {
          x: basePos.x + inputPos.x,
          y: basePos.y + inputPos.y,
          z: basePos.z + inputPos.z
        };
        entity.teleport(targetPos);
      });
  };

  const editInv = () => {
    const entityInv = entity.getComponent(
      EntityComponentTypes.Inventory
    )?.container;
    const playerInv = player.getComponent(
      EntityComponentTypes.Inventory
    ).container;

    if (!entityInv) {
      openErrorDialog({
        translate: 'eds.error.inventory.noInventoryComponent'
      });
      return;
    }

    const entityEquip = entity.getComponent(EntityComponentTypes.Equippable);
    const playerEquip = player.getComponent(EntityComponentTypes.Equippable);

    const entityEquipSlots = entityEquip
      ? EQUIPMENT_SLOTS.map(slotName => entityEquip.getEquipmentSlot(slotName))
      : null;
    const playerEquipSlots = EQUIPMENT_SLOTS.map(slotName =>
      playerEquip.getEquipmentSlot(slotName)
    );

    const actionForm = genActionFormFromInvAndEquip(
      entityInv,
      entityEquipSlots
    ).title({ translate: 'gui.eds.editInv.title' });
    actionForm.show(player).then(resp => {
      if (resp.canceled) return;

      const slotIndex = resp.selection;
      const slot =
        slotIndex < entityInv.size
          ? entityInv.getSlot(slotIndex)
          : entityEquipSlots?.[slotIndex - entityInv.size];

      const playerInvForm = genActionFormFromInvAndEquip(
        playerInv,
        playerEquipSlots
      );

      new ActionFormData()
        .title({ translate: 'gui.eds.title' })
        .button({ translate: 'gui.eds.editInv.delete' })
        .button({ translate: 'gui.eds.editInv.take' })
        .button({ translate: 'gui.eds.editInv.get' })
        .button({ translate: 'gui.eds.editInv.replace' })
        .button({ translate: 'gui.eds.editInv.swap' })
        .show(player)
        .then(resp2 => {
          if (resp2.canceled) return;

          switch (resp2.selection) {
            case 0:
              slot.setItem();
              break;
            case 1:
            case 2:
              if (playerInv.emptySlotsCount) {
                playerInv.addItem(slot.getItem());
              } else {
                player.dimension.spawnItem(slot.getItem(), player.location);
              }

              if (resp2.selection === 1) slot.setItem();
              break;
            case 3:
              playerInvForm
                .title({
                  translate: 'gui.eds.editInv.playerInv.seleItemToReplace'
                })
                .show(player)
                .then(resp3 => {
                  if (resp3.canceled) return;
                  const playerSlotIndex = resp3.selection;
                  const playerSlot =
                    playerSlotIndex < 36
                      ? playerInv.getSlot(playerSlotIndex)
                      : playerEquipSlots[playerSlotIndex - 36];
                  slot.setItem(playerSlot.getItem());
                });
              break;
            case 4:
              playerInvForm
                .title({
                  translate: 'gui.eds.editInv.playerInv.seleItemToSwap'
                })
                .show(player)
                .then(resp3 => {
                  if (resp3.canceled) return;
                  const playerSlotIndex = resp3.selection;
                  const playerSlot =
                    playerSlotIndex < 36
                      ? playerInv.getSlot(playerSlotIndex)
                      : playerEquipSlots[playerSlotIndex - 36];
                  const playerSlotItem = playerSlot.getItem()?.clone?.();

                  playerSlot.setItem(slot.getItem());
                  slot.setItem(playerSlotItem);
                });
              break;
          }
        });
    });
  };

  const setAttributes = () => {
    /**
     * @type {[EntityComponentTypes, EntityAttributeComponent][]}
     */
    const attrComps = ATTRIBUTE_NAMES.map(attrName =>
      entity.getComponent(attrName)
    )
      .filter(comp => comp !== void 0)
      .map((comp, i) => [ATTRIBUTE_NAMES[i], comp]);

    if (attrComps.length === 0) {
      openErrorDialog({
        translate: 'eds.error.attributes.noAttributesComponent'
      });
      return;
    }

    const form = new ModalFormData()
      .title({ translate: 'gui.eds.setAttr.title' })
      .submitButton({ translate: 'gui.done' });
    attrComps.forEach(([attrName, comp]) => {
      form.textField(
        {
          translate: `eds.attrName.${attrName.slice(10).replace('player.', '')}`
        },
        `${comp.effectiveMin} ~ ${comp.effectiveMax}`,
        { defaultValue: comp.currentValue.toFixedWithoutZero(5) }
      );
    });

    form.show(player).then(resp => {
      if (resp.canceled) return;

      resp.formValues.forEach((value, i) => {
        if (isNaN(value)) {
          openErrorDialog({
            translate: 'eds.error.attributes.invalidValue',
            with: [value]
          });
          return;
        }

        const numericValue = +value;
        const [, comp] = attrComps[i];

        if (
          numericValue < comp.effectiveMin ||
          numericValue > comp.effectiveMax
        ) {
          openErrorDialog({
            translate: 'eds.error.attributes.valueOutOfRange',
            with: [
              numericValue.toFixed(2),
              comp.effectiveMin.toFixed(2),
              comp.effectiveMax.toFixed(2)
            ]
          });
          return;
        }

        comp.setCurrentValue(numericValue);
      });
    });
  };

  const applyDamage = () => {
    new ActionFormData()
      .title({ translate: 'gui.eds.applyDamage.title' })
      .button({ translate: 'gui.eds.applyDamage.byProj' })
      .button({ translate: 'gui.eds.applyDamage.general' })
      .show(player)
      .then(resp => {
        if (resp.canceled) return;

        const form = new ModalFormData()
          .title({ translate: 'gui.eds.applyDamage.damageOptions' })
          .textField({ translate: 'gui.eds.applyDamage.amount' }, '')
          .textField(
            { translate: 'gui.eds.applyDamage.damagingEntity' },
            { translate: 'gui.eds.applyDamage.entityIdPlaceholder' },
            { tooltip: { translate: 'gui.eds.applyDamage.getIdHelp' } }
          )
          .submitButton({ translate: 'gui.done' });
        switch (resp.selection) {
          case 0:
            form
              .textField(
                { translate: 'gui.eds.applyDamage.damagingProjectile' },
                { translate: 'gui.eds.applyDamage.entityIdPlaceholder' },
                { tooltip: { translate: 'gui.eds.applyDamage.getIdHelp' } }
              )
              .show(player)
              .then(resp2 => {
                if (resp2.canceled) return;

                const damageAmount = +resp2.formValues[0];
                if (isNaN(damageAmount) || damageAmount < 0) {
                  openErrorDialog({
                    translate: 'eds.error.damage.invalidDamageAmount'
                  });
                  return;
                }
                if (!world.getEntitySafe(resp2.formValues[2])) {
                  openErrorDialog({
                    translate: 'eds.error.damage.invalidProjectile'
                  });
                  return;
                }

                entity.applyDamage(damageAmount, {
                  damagingEntity: world.getEntitySafe(resp2.formValues[1]),
                  damagingProjectile: world.getEntitySafe(resp2.formValues[2])
                });
              });
            break;
          case 1:
            form
              .dropdown(
                { translate: 'gui.eds.applyDamage.cause' },
                Object.values(EntityDamageCause)
              )
              .show(player)
              .then(resp2 => {
                if (resp2.canceled) return;

                const damageAmount = +resp2.formValues[0];
                if (isNaN(damageAmount) || damageAmount < 0) {
                  openErrorDialog({
                    translate: 'eds.error.damage.invalidDamageAmount'
                  });
                  return;
                }

                entity.applyDamage(damageAmount, {
                  damagingEntity: world.getEntitySafe(resp2.formValues[1]),
                  cause: Object.values(EntityDamageCause)[resp2.formValues[2]]
                });
              });
            break;
        }
      });
  };

  const applyImpulse = () => {
    new ModalFormData()
      .title({ translate: 'gui.eds.applyImpulse.title' })
      .textField('X', '')
      .textField('Y', '')
      .textField('Z', '')
      .submitButton({ translate: 'gui.done' })
      .show(player)
      .then(resp => {
        if (resp.canceled) return;

        const vec = {
          x: +resp.formValues[0],
          y: +resp.formValues[1],
          z: +resp.formValues[2]
        };

        if (isNaN(vec.x) || isNaN(vec.y) || isNaN(vec.z)) {
          openErrorDialog({ translate: 'eds.error.impulse.invalidVector' });
          return;
        }

        entity.applyImpulse(vec);
      });
  };

  const runCommand = () => {
    new ModalFormData()
      .title({ translate: 'gui.eds.runCommand.title' })
      .textField({ translate: 'gui.eds.runCommand.label' }, '')
      .submitButton({ translate: 'gui.done' })
      .show(player)
      .then(resp => {
        if (resp.canceled) return;

        const command = resp.formValues[0].trim();
        if (!command) {
          openErrorDialog({ translate: 'eds.error.command.emptyCommand' });
          return;
        }

        entity.runCommand(command);
      });
  };

  new ActionFormData()
    .title({ translate: 'gui.eds.title' })
    .button({ translate: 'gui.eds.info' })
    .button({ translate: 'gui.eds.kill' })
    .button({ translate: 'gui.eds.remove' })
    .button({ translate: 'gui.eds.tp' })
    .button({ translate: 'gui.eds.editInv' })
    .button({ translate: 'gui.eds.setAttributes' })
    .button({ translate: 'gui.eds.applyDamage' })
    .button({ translate: 'gui.eds.applyImpulse' })
    .button({ translate: 'gui.eds.extinguishFire' })
    .button({ translate: 'gui.eds.runCommand' })
    .show(player)
    .then(resp => {
      if (resp.canceled) return;

      switch (resp.selection) {
        case 0:
          getInfo();
          break;
        case 1:
          if (
            !entity.kill() &&
            entity.hasComponent(EntityComponentTypes.Health)
          ) {
            entity.getComponent(EntityComponentTypes.Health).setCurrentValue(0);
          }
          break;
        case 2:
          if (entity instanceof Player) {
            openErrorDialog({ translate: 'eds.error.remove.cannotRemove' });
            return;
          }
          entity.remove();
          break;
        case 3:
          tp();
          break;
        case 4:
          editInv();
          break;
        case 5:
          setAttributes();
          break;
        case 6:
          applyDamage();
          break;
        case 7:
          applyImpulse();
          break;
        case 8:
          entity.extinguishFire();
          break;
        case 9:
          runCommand();
          break;
      }
    });
};

export { startDebugEntity };
