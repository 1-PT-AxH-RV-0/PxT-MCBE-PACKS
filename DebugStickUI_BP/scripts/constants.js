import { system } from '@minecraft/server';

// 常量定义
export const ITEM_DOT_FORM_BLOCK_IDS = new Set([
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

// 工具函数
export const arrMin = (arr) => Math.min.apply(null, arr);
export const arrMax = (arr) => Math.max.apply(null, arr);

export const isBooleanState = (validValues) => {
  return validValues.every((validValue) => typeof validValue === 'boolean');
};

export const isRangeState = (validValues) => {
  if (validValues.length === 0) return false;
  if (validValues.some((validValue) => typeof validValue !== 'number'))
    return false;

  const min = arrMin(validValues);
  const max = arrMax(validValues);

  // 连续整数序列的长度应该等于 (max - min + 1)
  return max - min + 1 === validValues.length;
};

export const throttle = (fn, delayInTicks) => {
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

export const getItemIdFromBlock = (block) => {
  const typeId = block.typeId.replace('minecraft:', '');
  if (ITEM_DOT_FORM_BLOCK_IDS.has(typeId)) {
    return 'item.' + typeId;
  }
  return typeId;
};

export const setState = (block, state, value) =>
  block.setPermutation(block.permutation.withState(state, value));

export const breakBlock = (block) => {
  block.dimension.runCommand(
    `setblock ${block.x} ${block.y} ${block.z} air destroy`
  );
};

export const raycastBlock = (
  origin,
  rotation,
  dimension,
  maxDistance,
  stepSize = 0.05
) => {
  // 检查原点是否有效
  try {
    const originBlock = dimension.getBlock(origin);
    if (!originBlock) {
      return void 0; // 原点超出世界边界或未加载
    }
  } catch (error) {
    return void 0; // 原点位置无效
  }

  // 将旋转角度转换为弧度
  const pitch = rotation.x * (Math.PI / 180); // 垂直旋转
  const yaw = rotation.y * (Math.PI / 180); // 水平旋转

  // 计算射线方向向量
  const direction = {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch)
  };

  // 归一化方向向量
  const length = Math.sqrt(
    direction.x ** 2 + direction.y ** 2 + direction.z ** 2
  );
  const normalizedDirection = {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length
  };

  const maxSteps = Math.ceil(maxDistance / stepSize);

  let lastValidBlock = null;
  let currentPos = { ...origin };
  let prevPos = null;

  for (let step = 0; step <= maxSteps; step++) {
    // 计算下一步位置
    const currentSteppedLength =
      step === maxSteps ? maxDistance : step * stepSize;
    currentPos = {
      x: origin.x + normalizedDirection.x * currentSteppedLength,
      y: origin.y + normalizedDirection.y * currentSteppedLength,
      z: origin.z + normalizedDirection.z * currentSteppedLength
    };
    // 如果向零取整后的坐标与上一次相同，则直接跳过
    if (prevPos) {
      if (
        parseInt(currentPos.x) === parseInt(prevPos.x) &&
        parseInt(currentPos.y) === parseInt(prevPos.y) &&
        parseInt(currentPos.z) === parseInt(prevPos.z)
      )
        continue;
    }

    // 获取当前位置的方块
    let block;
    try {
      block = dimension.getBlock(currentPos);
    } catch (error) {
      // 遇到未加载区块或世界边界，返回最后一个有效方块
      return lastValidBlock || void 0;
    }

    if (!block) {
      // 无法获取方块（未加载或超出边界），返回最后一个有效方块
      return lastValidBlock || void 0;
    }

    lastValidBlock = block;
    prevPos = { ...currentPos };

    if (block.typeId !== 'minecraft:air') {
      return block;
    }
  }

  return lastValidBlock || void 0;
};
