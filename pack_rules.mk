# 自动生成的打包规则

OUTPUT_DIR := ./packs

$(OUTPUT_DIR)/DebugStickUI.mcaddon: DebugStickUI_RP DebugStickUI_BP
	@echo "正在创建 .mcaddon: $@"
	@mkdir -p $(OUTPUT_DIR)
	@zip -rdc $@ $^ -x "*/.*"

$(OUTPUT_DIR)/InventoryPresets.mcaddon: InventoryPresets_RP InventoryPresets_BP
	@echo "正在创建 .mcaddon: $@"
	@mkdir -p $(OUTPUT_DIR)
	@zip -rdc $@ $^ -x "*/.*"

$(OUTPUT_DIR)/ItemLoreEditor.mcaddon: ItemLoreEditor_BP ItemLoreEditor_RP
	@echo "正在创建 .mcaddon: $@"
	@mkdir -p $(OUTPUT_DIR)
	@zip -rdc $@ $^ -x "*/.*"

PACKS := $(OUTPUT_DIR)/DebugStickUI.mcaddon \
          $(OUTPUT_DIR)/InventoryPresets.mcaddon \
          $(OUTPUT_DIR)/ItemLoreEditor.mcaddon

packs: $(PACKS)

$(OUTPUT_DIR)/ALL_PACKS.mcaddon: $(shell find . -maxdepth 1 -type d -exec test -f '{}/manifest.json' \; -print | sed 's|^\./||')
	@echo "正在合并创建为 .mcaddon: $@"
	@mkdir -p $(OUTPUT_DIR)
	@zip -rdc $@ $^ -x "*/.*" -x "$(OUTPUT_DIR)/*"

ADDON := $(OUTPUT_DIR)/ALL_PACKS.mcaddon

addon: $(ADDON)
