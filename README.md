# PxT-MCBE-PACKS

这是我制作的一些 MCBE 的实用附加包，包括以下内容：

- InventoryPresets: 物品栏预设。以自定义命令的形式添加了操作物品栏工具方便地管理物品栏。
- ItemLoreEditor: 添加修改物品描述（Lore）的相关自定义命令，以在不更改 NBT 的情况下编辑物品描述。
- DebugStickUI: 添加了带 UI 的调试棒，不仅包含编辑方块状态的功能，还有修改坐标、修改方块、获取物品的功能。
- BritishEnglishSupplement: 补充一些技术性方块的英式英语翻译（e.g. tile.bubble\_column.name → Bubble Column），并修改了一些不准确翻译（e.g. Crops(tile.wheat.name) → Wheat Crops）。
- BlockTextureSupplement: 为一些因未在 blocks.json 中声明纹理而使用占位符纹理或默认纹理的方块，如未知（minecraft\:unknown）、数据更新方块（minecraft\:info\_update）、活塞头（minecraft\:piston\_arm\_collision）等添加了纹理，以便于区分。 
- GetBlockStates: （测试用）获取所有方块的方块状态及其可用值，并以 JSON 字符串的格式输出至控制台。

## 文件夹命名规范

1. 一个 pack 作一个文件夹，文件夹名即 make 生成的压缩包的文件名；
2. 若有互相依赖的 pack，则生成的压缩包文件名为第一个检测到的文件夹名的下划线之前的部分（e.g. ItemLoreEditor\_RP → ItemLoreEditor）；
3. \_RP 后缀表示资源包，\_BP 则是行为包。

## Make

- 使用 `make` 或 `make all` 以生成各个 pack 的 .mcpack（若有 pack 互相依赖，则会合并生成 .mcaddon），同时生成包含所有包的 ALL\_PACKS.mcaddon 文件。
- 使用 `make packs` 以只生成 .mcpack（互相依赖的包仍然会合并为 .mcaddon）。
- 使用 `make addon` 以只生成 ALL\_PACKS.mcaddon 文件。
- 使用 `make clean` 以清除生成的 .mcpack 和 .mcaddon。

## BlockTextureSupplement 中纹理的来源

- reserved6.png、unknown.png、info\_update.png 和 info\_update2.png 为原版纹理修改，文字的字体为 Minecraft-Seven（两个数据更新方块因为空间不够而做了一些修改）。
- moving\_block.png 和 piston\_arm\_collision.png 是基于[纹理更新补丁包 by Bilibili@云飞羊Rainvay](https://m.bilibili.com/video/BV1RY4y1M7tP)及原版纹理修改而来。
- sticky\_piston\_arm\_collision.png 是基于[原版优化 by Bilibili@wtitemilk](https://m.bilibili.com/video/BV1EgYQz5E7a)的纹理修改的。

## 关于 pack\_icon.png

- BritishEnglishSupplement 和 BlockTextureSupplement 的 pack\_icon.png 参考[方块标准视图制作](https://zh.minecraft.wiki/w/Help:标准视图#使用Blockbench)使用 BlockBench 制作。其中 BlockTextureSupplement 中的方块是「涂蜡的锈蚀切制铜双层台阶」（MCBE 中 ID 最长的方块），使用的纹理为[原版优化 by Bilibili@wtitemilk](https://m.bilibili.com/video/BV1EgYQz5E7a)。
- ItemLoreEditor 和 InventoryPresets 的 pack\_icon.png 使用 [MC 标题生成器](https://ewanhowell.com/plugins/minecraft-title-generator).
- DebugStickUI 的 pack\_icon.png 是原版木棍纹理的 64px 版本。
- GetBlockStates 因为不是正式包所以没有 pack\_icon.png。