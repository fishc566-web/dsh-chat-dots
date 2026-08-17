# dsh-chat-dots

ChatGPT 风格的「对话轮次小圆点」—— DeepSeek Harness (DSH) Web GUI 永久插件。

聊天区最左侧悬浮一列小圆点，**每个圆点 = 当前对话中的一轮「问→答」**（已完成回合）：

- 点击圆点 → 直接跳回那一轮回答；
- 最多显示最近 **10** 轮（滑动窗口）：对话进行到第 11 轮时，顶格显示第 2 轮（2~11，最旧的第 1 轮被挤出）；
- **当前高亮跟随滚动**：圆点随对话滚动而移动，当前在视口内那一轮高亮（品牌色 + 描边）；
- 悬停显示「第 N 轮 · 时间」；
- 圆点列随侧边栏宽度自动校准位置（侧边栏展开 264–420px / 折叠 56px rail）；
- 随当前会话切换自动切换数据源（看哪个对话就显示哪个对话的轮次）。

## 数据与跳转原理（浏览器侧，无需宿主服务）

| 数据 | 来源 |
|---|---|
| 当前会话 | `useSessions` 快照的 `current` |
| 已完成回合 | `sessions.binding(current).session` 会话快照的 `turnEnds`（回合号 → turn/end seq）与 `turnTimings` |
| 回合 DOM 锚点 | `snap.chat.order` + `snap.chat.nodes` 的节点 location → `[data-chat-flow-key]` 行 |
| 跳转 | 计算目标行相对 `[data-conversation-scroll]` 滚动容器的位置并 `scrollTop` |

## 结构

| 文件 | 作用 |
|---|---|
| `lib/index.js` | 宿主半区（占位行，使 bundle 行可解析） |
| `lib/client.js` | 浏览器半区：`shell.overlay` 插槽中的悬浮圆点列 |
| `cordis.patch.yml` | 向 web profile roster 插入 `chat-dots` 行 |

## 安装

```bash
git clone https://github.com/fishc566-web/dsh-chat-dots.git
dsh plugin --profile web add link:<仓库路径>
# 或手动挂载：dependencies 加 "dsh-chat-dots": "link:<路径>" + bundles 行，
# 然后执行：pnpm --dir ~/.dsh/profiles/web install
```

重启 DeepSeek Harness（若宿主已重启过，浏览器强制刷新即可）——聊天区最左侧出现圆点列。插件跨重启永久生效，可在插件设置中管理。

## License

Apache-2.0
