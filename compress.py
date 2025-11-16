import os
import zipfile
import tempfile
import shutil
import subprocess
import glob
import json


def minify_json_files(directory):
    """递归最小化目录中的所有JSON文件"""
    minified_count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".json"):
                json_path = os.path.join(root, file)
                try:
                    # 读取JSON文件
                    with open(json_path, "r", encoding="utf-8") as f:
                        data = json.load(f)

                    # 最小化写入（去除空格和换行）
                    with open(json_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)

                    minified_count += 1
                except (json.JSONDecodeError, UnicodeDecodeError) as e:
                    print(f"    警告：无法解析JSON文件 {json_path}: {e}")
                except Exception as e:
                    print(f"    警告：处理JSON文件 {json_path} 时出错: {e}")

    return minified_count


def process_scripts_directory(scripts_dir):
    """处理单个scripts目录"""
    index_js_path = os.path.join(scripts_dir, "index.js")

    if not os.path.exists(index_js_path):
        return False, "未找到 scripts/index.js"

    # 切换到scripts目录执行esbuild命令
    original_cwd = os.getcwd()
    os.chdir(scripts_dir)

    try:
        # 执行esbuild命令
        result = subprocess.run(
            [
                "esbuild",
                "index.js",
                "--bundle",
                "--format=esm",
                "--minify",
                "--outfile=index.js",
                "--external:@minecraft/*",
                "--allow-overwrite",
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            return False, f"esbuild执行失败: {result.stderr}"

        # 删除scripts目录中除index.js外的所有文件
        for item in os.listdir(scripts_dir):
            item_path = os.path.join(scripts_dir, item)
            if item != "index.js":
                if os.path.isfile(item_path):
                    os.remove(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)

        return True, "处理成功"

    finally:
        os.chdir(original_cwd)


def process_mcpack_file(file_path, temp_dir):
    """处理单个.mcpack文件"""
    try:
        # 解压文件到临时目录
        with zipfile.ZipFile(file_path, "r") as zip_ref:
            zip_ref.extractall(temp_dir)

        # 最小化所有JSON文件
        json_count = minify_json_files(temp_dir)
        print(f"    最小化了 {json_count} 个JSON文件")

        # 检查是否存在scripts/index.js
        scripts_dir = os.path.join(temp_dir, "scripts")

        if os.path.exists(scripts_dir):
            success, message = process_scripts_directory(scripts_dir)
            if not success:
                return False, message
        else:
            print("    未找到scripts目录，跳过JavaScript处理")

        # 重新压缩文件
        with zipfile.ZipFile(file_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path_full = os.path.join(root, file)
                    arcname = os.path.relpath(file_path_full, temp_dir)
                    zipf.write(file_path_full, arcname)

        return True, f"处理完成（最小化 {json_count} 个JSON文件）"

    except Exception as e:
        return False, f"处理文件时出错: {e}"


def process_mcaddon_file(file_path, temp_dir):
    """处理单个.mcaddon文件"""
    try:
        # 解压.mcaddon文件到临时目录
        with zipfile.ZipFile(file_path, "r") as zip_ref:
            zip_ref.extractall(temp_dir)

        processed_count = 0
        json_total_count = 0
        messages = []

        # 最小化整个.mcaddon包中的JSON文件
        json_count = minify_json_files(temp_dir)
        json_total_count += json_count
        print(f"    最小化了 {json_count} 个JSON文件")

        # 遍历临时目录中的所有顶层项目
        for item in os.listdir(temp_dir):
            item_path = os.path.join(temp_dir, item)

            # 只处理目录（忽略文件）
            if os.path.isdir(item_path):
                # 检查该目录中是否有scripts/index.js
                scripts_dir = os.path.join(item_path, "scripts")
                index_js_path = os.path.join(scripts_dir, "index.js")

                if os.path.exists(index_js_path):
                    success, message = process_scripts_directory(scripts_dir)
                    if success:
                        processed_count += 1
                        messages.append(f"  {item}: 处理成功")
                    else:
                        messages.append(f"  {item}: {message}")
                else:
                    messages.append(f"  {item}: 未找到scripts/index.js，跳过")

        # 重新压缩文件
        with zipfile.ZipFile(file_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path_full = os.path.join(root, file)
                    arcname = os.path.relpath(file_path_full, temp_dir)
                    zipf.write(file_path_full, arcname)

        if processed_count == 0:
            return (
                False,
                f"未找到任何包含scripts/index.js的包（最小化 {json_total_count} 个JSON文件）",
            )

        return (
            True,
            f"处理完成，共处理了 {processed_count} 个包（最小化 {json_total_count} 个JSON文件）\n"
            + "\n".join(messages),
        )

    except Exception as e:
        return False, f"处理文件时出错: {e}"


def process_files():
    """主处理函数"""
    # 定义packs目录路径
    packs_dir = "packs"

    # 检查packs目录是否存在
    if not os.path.exists(packs_dir):
        print(f"错误：目录 '{packs_dir}' 不存在")
        return

    # 查找所有.mcpack和.mcaddon文件
    mcpack_files = glob.glob(os.path.join(packs_dir, "*.mcpack"))
    mcaddon_files = glob.glob(os.path.join(packs_dir, "*.mcaddon"))
    all_files = mcpack_files + mcaddon_files

    if not all_files:
        print("未找到任何.mcpack或.mcaddon文件")
        return

    print(
        f"找到 {len(mcpack_files)} 个.mcpack文件, {len(mcaddon_files)} 个.mcaddon文件"
    )

    total_json_files = 0

    for file_path in all_files:
        print(f"\n处理文件: {os.path.basename(file_path)}")

        # 创建临时目录
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                if file_path.endswith(".mcpack"):
                    success, message = process_mcpack_file(file_path, temp_dir)
                elif file_path.endswith(".mcaddon"):
                    success, message = process_mcaddon_file(file_path, temp_dir)

                if success:
                    print(f"  ✓ {message}")
                    # 从消息中提取JSON文件数量
                    if "最小化" in message:
                        import re

                        match = re.search(r"最小化 (\d+) 个JSON文件", message)
                        if match:
                            total_json_files += int(match.group(1))
                else:
                    print(f"  ✗ {message}")

            except Exception as e:
                print(f"  ✗ 处理文件时出错: {e}")

    if total_json_files > 0:
        print(f"\n总计最小化了 {total_json_files} 个JSON文件")


if __name__ == "__main__":
    # 检查esbuild是否可用
    try:
        subprocess.run(["esbuild", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("错误：未找到esbuild命令，请确保已安装esbuild")
        print("安装命令: npm install -g esbuild")
        exit(1)

    process_files()
    print("\n所有文件处理完成！")
