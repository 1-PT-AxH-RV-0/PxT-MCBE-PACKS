# PxT-MCBE-PACKS

这是我制作的一些 MCBE 的实用附加包，包括以下内容：

- InventoryPresets: 物品栏预设。以自定义命令的形式添加了操作物品栏工具方便地管理物品栏。
- ItemLoreEditor: 添加修改物品描述（Lore）的相关自定义命令，以在不更改 NBT 的情况下编辑物品描述。
- DebugStickUI: 添加了带 UI 的调试棒，不仅包含编辑方块状态的功能，还有修改坐标、修改方块、获取物品的功能。
- BritishEnglishSupplement: 补充一些技术性方块的英式英语翻译（e.g. tile.bubble_column.name →
Bubble Column），并修改了一些不准确翻译（e.g. Crops(tile.wheat.name) → Wheat Crops）。
- GetBlockStates: （测试用）获取所有方块的方块状态及其可用值，并以 JSON 字符串的格式输出至控制台。

## 文件夹命名规范

1. 一个 pack 作一个文件夹，文件夹名即 make 生成的压缩包的文件名；
2. 若有互相依赖的 pack，则生成的压缩包文件名为第一个检测到的文件夹名的下划线之前的部分（e.g. ItemLoreEditor_RP → ItemLoreEditor）；
3. _RP 后缀表示资源包，_BP 则是行为包。

## Make

- 使用 `make` 或 `make all` 以生成各个 pack 的 .mcpack（若有 pack 互相依赖，则会合并生成 .mcaddon），\
同时生成包含所有包的 ALL\_PACKS.mcaddon 文件。
- 使用 `make packs` 以只生成 .mcpack（互相依赖的包仍然会合并为 .mcaddon）。
- 使用 `make addon` 以只生成 ALL\_PACKS.mcaddon 文件。
- 使用 `make clean` 以清除生成的 .mcpack 和 .mcaddon。

