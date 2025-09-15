all: packs addon

# 使用Python脚本分析依赖关系并生成打包指令
PACK_INFO := $(shell python pack_analyzer.py --generate-makefile)

# 包含由Python脚本生成的打包规则
include pack_rules.mk

# 清理目标
clean:
	@echo "清理所有附加包文件"
	@rm -f $(PACKS) $(ADDON)
	@rm -f pack_rules.mk
	@python pack_analyzer.py --clean

.PHONY: all packs addon clean
