import { EntityComponentTypes, EquipmentSlot } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';

const raycastEntities = (origin, direction, aabb) => {
  const center = aabb.center;
  const extent = aabb.extent;

  let t_enter = -Infinity;
  let t_exit = Infinity;

  // 对每个轴进行处理 (x, y, z)
  for (let axis of ['x', 'y', 'z']) {
    const originVal = origin[axis];
    const directionVal = direction[axis];
    const centerVal = center[axis];
    const extentVal = extent[axis];

    const minBound = centerVal - extentVal;
    const maxBound = centerVal + extentVal;

    // 处理方向分量为0的情况
    if (Math.abs(directionVal) < 1e-6) {
      if (originVal < minBound || originVal > maxBound) {
        return { hit: false, distance: 0, point: null };
      }
      continue;
    }

    const inv_d = 1.0 / directionVal;
    let t0 = (minBound - originVal) * inv_d;
    let t1 = (maxBound - originVal) * inv_d;

    // 确保 t0 是进入时间，t1 是离开时间
    if (t0 > t1) {
      [t0, t1] = [t1, t0];
    }

    t_enter = Math.max(t_enter, t0);
    t_exit = Math.min(t_exit, t1);

    if (t_enter > t_exit) {
      return { hit: false, distance: 0, point: null };
    }
  }

  // 最终检查
  if (t_enter <= t_exit && t_exit >= 0) {
    const distance = Math.max(t_enter, 0);

    const point = {
      x: origin.x + distance * direction.x,
      y: origin.y + distance * direction.y,
      z: origin.z + distance * direction.z
    };

    return {
      hit: true,
      distance: distance,
      point: point
    };
  }

  return { hit: false, distance: 0, point: null };
};

const genActionFormFromInvAndEquip = (inv, equip) => {
  const actionForm = new ActionFormData();
  for (let i = 0; i < inv.size; i++) {
    const item = inv.getItem(i);
    if (!item) {
      actionForm.button({
        rawtext: [
          { text: `§b[${i}]§r ` },
          { translate: 'gui.eds.editInv.emptySlot' }
        ]
      });
      continue;
    }

    actionForm.button({
      rawtext: [
        { text: `§b[${i}]§r ` },
        { translate: item.localizationKey },
        { text: `§r*${item.amount}` }
      ]
    });
  }

  if (equip) {
    for (let i = 0; i < EQUIPMENT_SLOTS.length; i++) {
      const slot = equip[i];
      const item = slot.getItem();
      if (!item) {
        actionForm.button({
          rawtext: [
            { text: `§b[${EQUIPMENT_SLOTS[i]}]§r ` },
            { translate: 'gui.eds.editInv.emptySlot' }
          ]
        });
        continue;
      }

      actionForm.button({
        rawtext: [
          { text: `§b[${EQUIPMENT_SLOTS[i]}]§r ` },
          { translate: item.localizationKey },
          { text: `§r*${item.amount}` }
        ]
      });
    }
  }

  return actionForm;
};

const EQUIPMENT_SLOTS = [
  EquipmentSlot.Head,
  EquipmentSlot.Chest,
  EquipmentSlot.Feet,
  EquipmentSlot.Legs,
  EquipmentSlot.Mainhand,
  EquipmentSlot.Offhand
];
const ATTRIBUTE_NAMES = [
  EntityComponentTypes.Health,
  EntityComponentTypes.Movement,
  EntityComponentTypes.LavaMovement,
  EntityComponentTypes.UnderwaterMovement,
  EntityComponentTypes.Hunger,
  EntityComponentTypes.Saturation,
  EntityComponentTypes.Exhaustion
];

export {
  raycastEntities,
  genActionFormFromInvAndEquip,
  EQUIPMENT_SLOTS,
  ATTRIBUTE_NAMES
};
