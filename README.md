# dsh-annotation-cards

Codex 式「选中文本 → 注解 → 随消息发送」插件，用于 **DeepSeek Harness (DSH)** 的 Web / Desktop 界面。

选中对话里的任意文字，直接把 AI 给的执行结果或你的说明写进注解卡片；发送时注解会跟着消息一起进入模型上下文，发送后原文位置显示成可展开的注解卡片。

## 安装

从 GitHub 安装（不需要 npm 账号）：

```sh
dsh plugin --profile web add github:kaige1986kg/dsh-annotation-cards
# 或锁定版本
dsh plugin --profile web add github:kaige1986kg/dsh-annotation-cards#v0.4.0
```

也可以直接安装本仓库打包好的 tarball：

```sh
dsh plugin --profile web add ./dsh-annotation-cards-0.4.0.tgz
```

安装后重启 / 刷新 DSH 界面；没有额外配置。

> 本仓库已提交构建产物 `lib/`，git 安装时不需要执行构建脚本（无 `prepare` 脚本）。
> 本包是标准 DSH bundle（`dsh.bundle.patch`），安装后自动向 profile 组合层插入 `annotation-cards` 行，无需手工编辑 `cordis.patch.yml`。


## 功能

- **选区胶囊**：拖选文字后出现 `加入对话`。
- **即时弹窗**：点击后在选区旁弹出小窗，输入执行结果/注释；`Enter` 保存，`Shift+Enter` 换行，`Esc` 取消。
- **蓝色角标**：保存后在被注解的原文旁显示蓝色角标，点击可再次编辑；滚动时跟随原文。
- **极简占位**：输入框上方只显示 `● N 条注释` 小胶囊，点击展开 Codex 式注解卡片列表（引文 + 注释 + 编辑/删除）。
- **发送时自动附加**：有注解时按 `Enter` 或点发送按钮，注解块会自动附加到消息（不重写已输入的草稿），随消息进入模型上下文。
- **发送后卡片化**：消息里的原始注解文本会被替换成 `● N 条注解 ⌄` 可展开卡片；模型拿到的仍是完整可读文本。

## 发送给模型的内容格式

```text
[[对话注解]]
注解 1 · 选中文本：
DELETE FROM t WHERE id = 1
注解 1 · 用户注释：
001 必传，驳回原因写得不清楚
[[/对话注解]]
```

## 兼容性

| 项 | 要求 |
|---|---|
| DSH | `>=0.2.0 <0.3.0`（`engines.dsh`） |
| @deepseek-ai/cordis | `^4.0.2`（peer） |
| Profile | `web` 或 `desktop`（浏览器 UI 插件） |

依赖 DSH 的内部客户端约定：`conversation.input.dock` 槽位、会话标准 props（`useInput` / `inputActions`）、以及输入框的合成 `paste` / 键盘重放行为。DSH 大版本升级后可能需要适配。

## 安全性

- 无网络请求、无文件系统写入、不执行任何外部命令、不读取凭据。
- 只在浏览器端操作 DOM 与输入框草稿；宿主 half 为空实现（`apply() {}`）。
- 注解保存在浏览器内存中，刷新页面后清空；已发送的消息里保留可读文本。

## 已知限制

- 蓝色角标依赖原消息 DOM 位置，消息重渲染/刷新/切换会话后消失。
- 发送后的卡片替换是 DOM 增强：识别不到消息气泡时退回显示原始可读文本（功能不受影响）。
- 斜杠命令草稿、图片附件不做拦截。
- 需要 DSH 的 Web 或 Desktop 界面（纯 CLI 环境无浏览器端）。

## 开发

`lib/client.js` 是手写的 DSH 客户端 bundle（`window.__ModuleLoader__.load({ id, factory })` lazy-CJS 格式），`lib/index.js` 是空宿主 half，`cordis.patch.yml` 是 bundle 的插入层。仓库内提供离线冒烟测试（`test/smoke.mjs`，假 DOM 全链路）。

## License

MIT
