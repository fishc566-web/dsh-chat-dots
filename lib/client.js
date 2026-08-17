window.__ModuleLoader__.load({
	id: "dsh-chat-dots",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		// ---------------------------------------------------------------- constants
		const MAX_DOTS = 10;
		const DEFAULT_SIDEBAR_WIDTH = 264; // sidebar open contract default (px)
		const COLLAPSED_RAIL_WIDTH = 56; // sidebar auto-collapse rail (px)
		const RAIL_STYLE_ID = "dsh-chat-dots-style";
		const SCROLLER_SELECTOR = "[data-conversation-scroll]";
		const ROW_SELECTOR = "[data-chat-flow-key]";

		const CSS = [
			".dcd-rail{position:fixed;top:0;bottom:0;width:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;pointer-events:none;z-index:60}",
			".dcd-dot{appearance:none;width:9px;height:9px;border-radius:9999px;border:none;padding:0;margin:0;cursor:pointer;pointer-events:auto;background:var(--dsw-alias-label-tertiary,#8a8f98);transition:background .15s,transform .15s,box-shadow .15s}",
			".dcd-dot:hover{background:var(--dsw-alias-label-secondary,#5f6672);transform:scale(1.3)}",
			".dcd-dot-active{width:11px;height:11px;background:var(--dsw-alias-brand-primary,#4176e6);box-shadow:0 0 0 3px var(--dsw-alias-interactive-bg-hover-accent,rgba(65,118,230,.18))}"
		].join("");

		// ------------------------------------------------- measurement (best-effort)
		// The shell frame is a three-column grid with the sidebar width in its
		// inline grid-template-columns ("<sidebar>px minmax(0, 1fr) <details>px").
		// Find it once by inline style, then re-parse cheaply on resize; fall
		// back to the collapsed-rail marker, then to the open default.
		let frameEl = null;
		function findFrame() {
			if (frameEl !== null && frameEl.isConnected) return frameEl;
			frameEl = null;
			const all = document.querySelectorAll("*");
			for (let i = 0; i < all.length; i++) {
				const el = all[i];
				const g = el.style && el.style.gridTemplateColumns;
				if (g && /^\d+px\s+minmax\(0,\s*1fr\)\s+\d+px$/.test(g.trim())) {
					frameEl = el;
					return el;
				}
			}
			return null;
		}
		function sidebarWidth() {
			try {
				const frame = findFrame();
				if (frame) {
					const m = /^(\d+)px/.exec(frame.style.gridTemplateColumns.trim());
					if (m) return parseInt(m[1], 10);
				}
				if (document.querySelector("[data-sidebar-collapsed]")) return COLLAPSED_RAIL_WIDTH;
			} catch (err) { /* measurement is best-effort */ }
			return DEFAULT_SIDEBAR_WIDTH;
		}

		function escapeAttr(value) {
			if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
			return String(value).replace(/["\\]/g, "\\$&");
		}

		// ------------------------------------------------------------ turn helpers
		// One dot = one completed Q&A round (turn). Completed turns come from
		// snapshot.turnEnds (turn number -> turn/end seq); the sliding window
		// keeps the LAST 10 turns, oldest at the top — with 11 turns the
		// topmost dot is turn 2, exactly the requested behavior.
		function buildTurns(snap) {
			if (!snap || !snap.turnEnds || snap.turnEnds.size === 0) return [];
			const timings = snap.turnTimings || new Map();
			const turns = [];
			for (const turn of snap.turnEnds.keys()) {
				const t = timings.get(turn);
				turns.push({ turn, time: (t && (t.endTime || t.startTime)) || 0 });
			}
			turns.sort((a, b) => a.turn - b.turn);
			return turns.slice(Math.max(0, turns.length - MAX_DOTS));
		}

		// First chat-flow node belonging to a turn (its DOM anchor key).
		function findTurnKey(snap, turn) {
			if (!snap || !snap.chat) return null;
			const order = snap.chat.order;
			const nodes = snap.chat.nodes;
			if (!order || !nodes) return null;
			for (const key of order) {
				const node = nodes.get(key);
				if (!node || !node.location) continue;
				const loc = node.location;
				if ((loc.kind === "turn" || loc.kind === "step") && loc.turn && loc.turn.turn === turn) return key;
			}
			const endSeq = snap.turnEnds ? snap.turnEnds.get(turn) : undefined;
			if (endSeq != null) {
				for (const key of order) {
					const node = nodes.get(key);
					if (node && node.anchorSeq === endSeq) return key;
				}
			}
			return null;
		}

		// Scroll the conversation so the target turn lands near the viewport top.
		function jumpToTurn(snap, turn) {
			const key = findTurnKey(snap, turn);
			if (key == null) return;
			try {
				const scroller = document.querySelector(SCROLLER_SELECTOR);
				if (scroller) {
					const row = scroller.querySelector('[data-chat-flow-key="' + escapeAttr(key) + '"]');
					if (row) {
						const target = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - scroller.clientHeight / 3;
						scroller.scrollTop = Math.max(0, target);
						return;
					}
				}
				const el = document.querySelector('[data-chat-flow-key="' + escapeAttr(key) + '"]');
				if (el) el.scrollIntoView({ block: "start" });
			} catch (err) { /* jump is best-effort */ }
		}

		function formatTime(ms) {
			try {
				const d = new Date(ms);
				const now = new Date();
				if (d.toDateString() === now.toDateString()) {
					return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
				}
				return d.toLocaleDateString([], { month: "short", day: "numeric" });
			} catch (err) {
				return "";
			}
		}

		// -------------------------------------------------------------------- plugin
		const inject = ["slots", "sessions"];

		// React subscription over the current session's conversation snapshot
		// (SessionFace is an ObservableSnapshot<ConversationSnapshot>).
		function useConversationSnapshot(binding) {
			return react.useSyncExternalStore(
				(cb) => (binding ? binding.session.subscribe(cb) : () => {}),
				() => (binding ? binding.session.getSnapshot() : undefined),
				() => undefined
			);
		}

		function apply(ctx) {
			const slots = ctx.get("slots");
			const sessions = ctx.get("sessions");
			if (!slots || !sessions) return;

			// Own stylesheet, removed with the plugin.
			ctx.effect(() => {
				if (document.getElementById(RAIL_STYLE_ID)) return () => {};
				const style = document.createElement("style");
				style.id = RAIL_STYLE_ID;
				style.textContent = CSS;
				document.head.appendChild(style);
				return () => { if (style.isConnected) style.remove(); };
			}, "dsh-chat-dots: styles");

			function ChatDotsRail(props) {
				const useSessions = props && props.useSessions;
				const [offset, setOffset] = react.useState(DEFAULT_SIDEBAR_WIDTH);
				react.useEffect(() => {
					let alive = true;
					const measure = () => { if (alive) setOffset(sidebarWidth()); };
					measure();
					window.addEventListener("resize", measure);
					// The sidebar can also change via drag/toggle without a resize
					// event; a light re-measure keeps the rail on the seam.
					const timer = setInterval(measure, 2000);
					return () => {
						alive = false;
						window.removeEventListener("resize", measure);
						clearInterval(timer);
					};
				}, []);

				const listSnap = typeof useSessions === "function" ? useSessions((s) => s) : undefined;
				const currentId = listSnap && listSnap.current;
				const binding = currentId ? sessions.binding(currentId) : undefined;
				const snap = useConversationSnapshot(binding);
				const turns = buildTurns(snap);

				// Scroll-linked active turn: the dot follows whichever turn is
				// currently in view; falls back to the latest turn.
				const [visibleTurn, setVisibleTurn] = react.useState(null);
				react.useEffect(() => {
					if (!snap) return;
					let alive = true;
					let last = 0;
					const scan = () => {
						if (!alive) return;
						try {
							const scroller = document.querySelector(SCROLLER_SELECTOR);
							if (!scroller) return;
							const rows = scroller.querySelectorAll(ROW_SELECTOR);
							const viewport = scroller.getBoundingClientRect();
							let found = null;
							for (const row of rows) {
								const rect = row.getBoundingClientRect();
								if (rect.bottom > viewport.top && rect.top < viewport.bottom) { found = row; break; }
							}
							if (!found) return;
							const key = found.getAttribute("data-chat-flow-key");
							const node = snap.chat && snap.chat.nodes ? snap.chat.nodes.get(key) : undefined;
							if (node && node.location) {
								const loc = node.location;
								const turn = (loc.kind === "turn" || loc.kind === "step") && loc.turn ? loc.turn.turn : undefined;
								if (turn != null) setVisibleTurn(turn);
							}
						} catch (err) { /* scan is best-effort */ }
					};
					scan();
					const scroller = document.querySelector(SCROLLER_SELECTOR);
					if (scroller) scroller.addEventListener("scroll", () => {
						const now = Date.now();
						if (now - last >= 200) { last = now; scan(); }
					}, { passive: true });
					window.addEventListener("resize", scan);
					const timer = setInterval(scan, 1500);
					return () => {
						alive = false;
						if (scroller) scroller.removeEventListener("scroll", scan);
						window.removeEventListener("resize", scan);
						clearInterval(timer);
					};
				}, [snap]);

				if (turns.length === 0) return null;
				const firstTurn = turns[0].turn;
				const lastTurn = turns[turns.length - 1].turn;
				const highlight = visibleTurn != null
					? (visibleTurn < firstTurn ? firstTurn : visibleTurn > lastTurn ? lastTurn : visibleTurn)
					: lastTurn;
				const dots = turns.map((t) => {
					const active = t.turn === highlight;
					const title = "第 " + t.turn + " 轮" + (active ? "（当前）" : "") + (t.time ? " · " + formatTime(t.time) : "");
					return react.createElement("button", {
						key: t.turn,
						className: active ? "dcd-dot dcd-dot-active" : "dcd-dot",
						title,
						"aria-label": title,
						onClick: () => jumpToTurn(snap, t.turn)
					});
				});
				return react.createElement(
					"div",
					{ className: "dcd-rail", style: { left: offset + 8 } },
					dots
				);
			}

			slots.inject("shell.overlay", () => slots.register(
				{ name: "shell.overlay", id: "chat-dots", order: 60 },
				ChatDotsRail
			));
		}

		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
