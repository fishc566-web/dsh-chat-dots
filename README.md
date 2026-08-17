Enter file contents here# dsh-chat-dots

ChatGPT-style **turn dots** for the DeepSeek Harness (DSH) web GUI — a permanent plugin.

A floating vertical column of dots at the left edge of the chat column. **Each dot is one completed Q&A round (turn) of the CURRENT conversation**:

- **Click a dot** → jump straight back to that round's answer;
- **Sliding window of 10**: at most the most recent 10 turns are shown. When the conversation reaches its 11th turn, the topmost dot becomes turn 2 (turns 2–11; the oldest turn 1 slides out);
- **Scroll-linked highlight**: the highlighted dot follows your reading position — the turn currently in view is highlighted (brand color + ring);
- **Hover tooltip**: `Turn N · time`;
- The rail auto-calibrates to the sidebar width (open 264–420px / collapsed 56px rail);
- Switches data source automatically when you open another conversation.

## How it works (browser side only — no host services needed)

| Data | Source |
|---|---|
| Current session | `useSessions` snapshot `current` |
| Completed turns | `sessions.binding(current).session` conversation snapshot: `turnEnds` (turn → turn/end seq) + `turnTimings` |
| Turn DOM anchor | `snap.chat.order` + `snap.chat.nodes` node location → `[data-chat-flow-key]` row |
| Jump | Compute target row position inside the `[data-conversation-scroll]` scrollport and set `scrollTop` |

## Layout

| File | Role |
|---|---|
| `lib/index.js` | Host half (no-op stub so the bundle row resolves) |
| `lib/client.js` | Browser half: the floating dot rail in the `shell.overlay` slot |
| `cordis.patch.yml` | Inserts the `chat-dots` row into the web profile roster |

## Install

```bash
git clone https://github.com/fishc566-web/dsh-chat-dots.git
dsh plugin --profile web add link:<path-to-repo>
# or add it manually: dependencies "dsh-chat-dots": "link:<path>" + bundles entry,
# then: pnpm --dir ~/.dsh/profiles/web install
```

Restart DeepSeek Harness (or hard-refresh the web page if the host already restarted) — the dots appear at the left edge of the chat column. The plugin persists across restarts and is manageable in the plugin settings.

## License

Apache-2.0
