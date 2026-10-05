import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { clientModelID } from './model-status.js';

// 第三方应用接入分三档：
//   auto        自动推送（WorkBuddy 由既有 sync 处理）
//   copy        一键复制引导（配置走 GUI / 二进制存储，无法安全自动写入）
//   unsupported 暂不支持（本版不处理）

export function modelList(models = []) {
  return models.map(m => clientModelID(m));
}

export function detectApps({ home = os.homedir(), platform = process.platform } = {}) {
  const support = platform === 'darwin' ? 'Library/Application Support' : platform === 'win32' ? 'AppData/Roaming' : '.config';
  const exists = async (...segments) => {
    try { const s = await fs.stat(path.join(home, ...segments)); return s !== undefined; } catch { return false; }
  };
  return async () => ({
    codex: await exists('.codex', 'config.toml'),
    'codex-dir': await exists('.codex'),
    cherry: await exists(support, 'CherryStudio'),
    cursor: await exists('.cursor'),
    trae: await exists(support, 'TRAE SOLO CN'),
    coze: false,
    claude: await exists('.claude'),
  });
}

// 生成给前端的应用列表 + 公共连接信息。
export function describeApps({ endpoint, key, models = [], home = os.homedir(), platform = process.platform, detected }) {
  const ids = modelList(models);
  const connection = { baseUrl: endpoint, apiKey: key, models: ids, count: ids.length };
  const baseUrl = endpoint.replace(/\/v1\/?$/, '');
  const apps = [
    {
      id: 'workbuddy', name: 'WorkBuddy', tier: 'auto', tierLabel: '自动推送',
      description: '由 OW Bridge 持续同步，点击「导入 WorkBuddy」即可保持最新。',
    },
    {
      id: 'codex', name: 'Codex CLI', tier: 'copy', tierLabel: '一键复制',
      installed: detected.codex || detected['codex-dir'],
      description: '配置存储在 ~/.codex/config.toml，需手动添加 provider。下方指引包含完整配置信息。',
      guide: `① 编辑 ~/.codex/config.toml，在顶部添加：\n[model_providers.ow-bridge]\nname = "OW Bridge (free models)"\nbase_url = "${endpoint}"\nwire_api = "chat"\nenv_key = "OW_BRIDGE_API_KEY"\n② 设置环境变量：export OW_BRIDGE_API_KEY="${key}"\n③ 在 config.toml 顶部设置 model 与 model_provider`,
    },
    {
      id: 'cherry', name: 'Cherry Studio', tier: 'copy', tierLabel: '一键复制',
      installed: detected.cherry,
      description: '配置存在本地 leveldb 中，无法自动写入；用「获取模型列表」自动拉取全部免费模型，无需手敲。',
      guide: `① 设置 → 模型服务 → + 添加，类型选 OpenAI\n② API 地址：${endpoint}\n③ API 密钥：${key}\n④ 点「获取模型列表」，OW Bridge 会通过 /v1/models 返回全部可用模型，勾选即可用\n（若提示 404，把 API 地址换成 ${baseUrl}）`,
    },
    {
      id: 'cursor', name: 'Cursor', tier: 'copy', tierLabel: '一键复制',
      installed: detected.cursor,
      description: '模型配置走 GUI、无 settings.json，无法自动写入。',
      guide: `Settings → Models → OpenAI API Key 处填下方信息，Base URL：${endpoint}，Model 前缀选可用模型或自定义填入任一 ID，API Key：${key}`,
    },
    {
      id: 'trae', name: 'TRAE SOLO CN', tier: 'copy', tierLabel: '一键复制',
      installed: detected.trae,
      description: '配置存在 Electron IndexedDB 中，无法自动写入。',
      guide: `设置 → 模型 → 添加模型 → 自定义模型：API 格式选「OpenAI Chat Completions」；请求地址填 ${endpoint}；模型 ID 填任一可用 ID；API 密钥填 ${key}。`,
    },
    {
      id: 'coze', name: 'Coze', tier: 'copy', tierLabel: '一键复制',
      description: '云端配置，需个人进阶版，仅网页/桌面手动添加。',
      guide: `需 Coze 进阶版「自定义模型」：Base URL ${endpoint}，API Key ${key}，选择任一可用模型 ID。`,
    },
    {
      id: 'claude', name: 'Claude CLI', tier: 'unsupported', tierLabel: '暂不支持',
      description: '本版暂不处理。',
    },
  ];
  return { connection, apps };
}