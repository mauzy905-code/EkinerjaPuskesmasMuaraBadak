:root {
  color-scheme: light;
  --bg: #0b1220;
  --panel: rgba(255, 255, 255, 0.08);
  --panel2: rgba(255, 255, 255, 0.12);
  --text: rgba(255, 255, 255, 0.92);
  --muted: rgba(255, 255, 255, 0.72);
  --border: rgba(255, 255, 255, 0.18);
  --good: #18c964;
  --warn: #f5a524;
  --bad: #f31260;
  --shadow: 0 12px 38px rgba(0, 0, 0, 0.35);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: radial-gradient(1000px 600px at 20% 10%, rgba(96, 165, 250, 0.35), transparent 60%),
    radial-gradient(900px 500px at 70% 20%, rgba(244, 114, 182, 0.3), transparent 60%),
    radial-gradient(900px 600px at 40% 80%, rgba(34, 197, 94, 0.16), transparent 70%),
    var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji',
    'Segoe UI Emoji';
}

a {
  color: inherit;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 14px 42px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.brand {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand h1 {
  font-size: 18px;
  margin: 0;
  letter-spacing: 0.2px;
}

.brand .subtitle {
  font-size: 12px;
  color: var(--muted);
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.panelHeader {
  padding: 14px 14px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.08), transparent);
  border-bottom: 1px solid var(--border);
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.input,
.select {
  background: rgba(0, 0, 0, 0.35);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  outline: none;
  min-height: 40px;
}

.input::placeholder {
  color: rgba(255, 255, 255, 0.45);
}

.button {
  background: rgba(255, 255, 255, 0.12);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  min-height: 40px;
}

.button.primary {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.35);
}

.button.danger {
  background: rgba(243, 18, 96, 0.18);
  border-color: rgba(243, 18, 96, 0.35);
}

.iconButton {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.35);
  cursor: pointer;
}

.iconButton:hover {
  background: rgba(255, 255, 255, 0.08);
}

.modalBackdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  padding: 14px;
  z-index: 50;
}

.modalCard {
  width: min(480px, 100%);
  background: rgba(10, 14, 25, 0.92);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.35);
  font-size: 12px;
  white-space: nowrap;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.dot.good {
  background: var(--good);
}

.dot.warn {
  background: var(--warn);
}

.dot.bad {
  background: var(--bad);
}

.tableWrap {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 920px;
}

thead th {
  text-align: left;
  font-size: 12px;
  color: var(--muted);
  padding: 12px 12px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.06);
  position: sticky;
  top: 0;
  z-index: 1;
}

tbody td {
  padding: 12px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  vertical-align: top;
}

tbody tr:hover td {
  background: rgba(255, 255, 255, 0.03);
}

.muted {
  color: var(--muted);
  font-size: 12px;
}

.link {
  color: rgba(147, 197, 253, 0.95);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.noteBlock {
  display: grid;
  gap: 8px;
}

.fileChip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.35);
  text-decoration: none;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.92);
  max-width: 220px;
}

.fileChip:hover {
  background: rgba(255, 255, 255, 0.08);
}

.fileIcon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.error {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(243, 18, 96, 0.35);
  background: rgba(243, 18, 96, 0.14);
}

.loginCard {
  max-width: 420px;
  margin: 40px auto 0;
  padding: 14px;
}

.loginCard h2 {
  margin: 6px 0 4px;
  font-size: 18px;
}

.loginCard p {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 12px;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

@media (max-width: 640px) {
  .grid2 {
    grid-template-columns: 1fr;
  }
}

