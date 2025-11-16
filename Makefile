all: packs addon compress

PACK_INFO := $(shell python pack_analyzer.py --generate-makefile)

include pack_rules.mk

compress:
	@echo "开始压缩代码..."
	@python compress.py
	@echo "代码压缩完成"

clean:
	@echo "清理所有附加包文件……"
	@rm -f $(PACKS) $(ADDON)
	@rm -f pack_rules.mk
	@python pack_analyzer.py --clean

.PHONY: all packs addon clean compress
