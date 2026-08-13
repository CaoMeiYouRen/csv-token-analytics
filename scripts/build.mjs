#!/usr/bin/env node
/**
 * Build launcher: 跨平台构建脚本（Windows / macOS / Linux）
 * 输出纯静态站点到 dist/（index.html + assets/ + 静态资源），可直接用 Nginx 部署。
 *
 * 注意：Windows 下 Node 24 的 fs.rmSync 存在静默失败 bug（返回成功但文件未删除），
 * 因此本脚本统一使用 fs.promises.rm。
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const DIST = path.join(ROOT, 'dist');
const CLIENT = path.join(DIST, 'client');

async function rmrf(dir) {
  await fs.promises.rm(dir, { recursive: true, force: true });
}

function cpDir(src, dest, { exclude } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      cpDir(srcPath, destPath, { exclude });
    } else if (!exclude || !exclude.some((ext) => entry.name.endsWith(ext))) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  // 清理
  await rmrf(DIST);

  // 1. Vite 构建 → dist/client/
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const result = spawnSync(
    process.execPath,
    [viteBin, 'build', '--outDir', CLIENT, '--emptyOutDir'],
    { cwd: ROOT, stdio: 'inherit', env: process.env },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  // 2. 组装纯静态 dist/：index.html + assets/ + public 静态文件
  cpDir(CLIENT, DIST);

  // 3. 合并私有静态资源（shared/static，排除代码文件）
  const STATIC = path.join(ROOT, 'shared', 'static');
  if (fs.existsSync(STATIC)) {
    cpDir(STATIC, DIST, { exclude: ['.ts', '.tsx', '.js', '.jsx'] });
  }

  // 清理中间产物
  await rmrf(CLIENT);

  console.log('Build complete');
  console.log('  Static site → dist/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
