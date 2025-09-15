import os
import json
import argparse
from pathlib import Path

def update_parent_mtime(directory):
    """
    按目录深度由深到浅反向递归，更新父目录的最后修改时间
    
    参数:
    directory: 要处理的根目录路径
    """
    try:
        # 转换为Path对象
        root_dir = Path(directory).resolve()
        
        if not root_dir.exists():
            print(f"错误：目录 '{directory}' 不存在")
            return
        
        if not root_dir.is_dir():
            print(f"错误：'{directory}' 不是目录")
            return
        
        # 获取所有子目录和文件的路径，按深度排序（从深到浅）
        all_paths = []
        for root, dirs, files in os.walk(root_dir):
            for name in dirs + files:
                path = Path(root) / name
                all_paths.append(path)
        
        # 按路径深度排序（深度大的在前）
        all_paths.sort(key=lambda p: len(p.parts), reverse=True)
        
        # 处理每个路径
        for path in all_paths:
            if not path.exists():
                continue
                
            parent = path.parent
            
            # 确保父目录在指定的根目录范围内
            if parent not in all_paths and parent != root_dir:
                continue
                
            if parent.exists() and path.exists():
                # 获取最后修改时间
                child_mtime = path.stat().st_mtime
                parent_mtime = parent.stat().st_mtime
                
                # 如果子项的最后修改时间比父目录晚，则更新父目录
                if child_mtime > parent_mtime:
                    try:
                        # 更新父目录的修改时间
                        os.utime(parent, (parent.stat().st_atime, child_mtime))
                        print(f"更新: {parent} 的修改时间 -> {child_mtime}")
                    except PermissionError:
                        print(f"权限不足，无法更新: {parent}")
                    except Exception as e:
                        print(f"更新 {parent} 时出错: {e}")
    
    except Exception as e:
        print(f"处理过程中发生错误: {e}")


def analyze_dependencies():
    """分析所有包的依赖关系"""
    packs = {}
    uuid_map = {}
    
    for dirpath in os.listdir('.'):
        if os.path.isdir(dirpath):
            manifest_path = os.path.join(dirpath, 'manifest.json')
            if os.path.exists(manifest_path):
                update_parent_mtime(dirpath)
                with open(manifest_path, 'r', encoding='utf-8') as f:
                    try:
                        manifest = json.load(f)
                        header = manifest.get('header', {})
                        uuid = header.get('uuid', '')
                        
                        packs[dirpath] = {
                            'uuid': uuid,
                            'dependencies': manifest.get('dependencies', []),
                            'has_uuid_dependency': False,
                            'dependent_packs': []
                        }
                        
                        if uuid:
                            uuid_map[uuid] = dirpath
                    except json.JSONDecodeError as e:
                        print(e)
                        continue
    
    for pack_name, pack_info in packs.items():
        for dep in pack_info['dependencies']:
            if 'uuid' in dep:
                pack_info['has_uuid_dependency'] = True
                dep_uuid = dep['uuid']
                if dep_uuid in uuid_map:
                    pack_info['dependent_packs'].append(uuid_map[dep_uuid])
    
    return packs, uuid_map

def generate_makefile_rules():
    """生成Makefile规则"""
    packs, _ = analyze_dependencies()
    output_dir = './packs'
    os.makedirs(output_dir, exist_ok=True)
    
    with open('pack_rules.mk', 'w', encoding='utf-8') as f:
        f.write("# 自动生成的打包规则\n\n")
        f.write("OUTPUT_DIR := ./packs\n")
        
        # 定义所有包的目标
        all_packs = []
        processed = set()
        
        for pack_name, pack_info in packs.items():
            if pack_name in processed:
                continue
                
            if pack_info['has_uuid_dependency']:
                # 处理有UUID依赖的包组
                group = {pack_name}
                for dep_pack in pack_info['dependent_packs']:
                    if dep_pack in packs:
                        group.add(dep_pack)
                
                if len(group) > 1:
                    # 生成mcaddon规则
                    mcaddon_name = sorted(group)[0].split('_')[0] + ".mcaddon"
                    f.write(f"\n$(OUTPUT_DIR)/{mcaddon_name}: {' '.join(group)}\n")
                    f.write("\t@echo \"正在创建 .mcaddon: $@\"\n")
                    f.write("\t@mkdir -p $(OUTPUT_DIR)\n")
                    f.write("\t@zip -rdc $@ $^ -x \"*/.*\"\n")
                    
                    all_packs.append(f"$(OUTPUT_DIR)/{mcaddon_name}")
                    processed.update(group)
                    continue
            
            # 生成单个包的mcpack规则
            f.write(f"\n$(OUTPUT_DIR)/{pack_name}.mcpack: {pack_name}\n")
            f.write("\t@echo \"正在创建 .mcpack: $@\"\n")
            f.write("\t@mkdir -p $(OUTPUT_DIR)\n")
            f.write("\t@cd $< && zip -rdc ../$@ .\n")
            
            all_packs.append(f"$(OUTPUT_DIR)/{pack_name}.mcpack")
            processed.add(pack_name)
        
        # 定义packs目标
        f.write("\nPACKS := " + " \\\n          ".join(all_packs) + "\n")
        f.write("\npacks: $(PACKS)\n")
        
        # 定义ALL_PACKS.mcaddon规则
        f.write("\n$(OUTPUT_DIR)/ALL_PACKS.mcaddon: $(shell find . -maxdepth 1 -type d -exec test -f '{}/manifest.json' \\; -print | sed 's|^\\./||')\n")
        f.write("\t@echo \"正在合并创建为 .mcaddon: $@\"\n")
        f.write("\t@mkdir -p $(OUTPUT_DIR)\n")
        f.write("\t@zip -rdc $@ $^ -x \"*/.*\" -x \"$(OUTPUT_DIR)/*\"\n")
        
        f.write("\nADDON := $(OUTPUT_DIR)/ALL_PACKS.mcaddon\n")
        f.write("\naddon: $(ADDON)\n")

def clean():
    """清理生成的文件"""
    if os.path.exists('pack_rules.mk'):
        os.remove('pack_rules.mk')
    if os.path.exists('./packs'):
        for f in os.listdir('./packs'):
            if f.endswith('.mcpack') or f.endswith('.mcaddon'):
                os.remove(os.path.join('./packs', f))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--generate-makefile', action='store_true', help='生成Makefile规则')
    parser.add_argument('--clean', action='store_true', help='清理生成的文件')
    args = parser.parse_args()
    
    if args.generate_makefile:
        generate_makefile_rules()
    elif args.clean:
        clean()
    else:
        print("请指定--generate-makefile或--clean参数")
