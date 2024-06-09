const styles = `\
.flower {
  --color-primary: #70c0e8;
  --color-primary-hover: #8acbec;
  --color-primary-active: #66afd3;
  --color-primary-suppl: #3889C5;
  --color-primary-rgb: 112, 192, 232;

  --color-bg: #101014;
  --color-bg-secondary: #18181c;
  --color-bg-tertiary: #303033;
  --color-text: #CECDC3;
  --color-text-secondary: #ccc;
  --color-text-tertiary: #aaa;

  --node-bg-color: var(--color-bg-secondary);
  --node-color: var(--color-text-secondary);
  --node-border-color: var(--color-bg-tertiary);

  --node-padding: 0.8em 1em;
  --node-title-size: 1.1rem;
  --node-radius: 8px;
  --node-socket-connection-bg: var(--color-text-tertiary);

  --ui-radius: calc(var(--node-radius) / 2);
  --ui-bg-color: var(--color-bg-tertiary);
  --ui-text-color: var(--color-text-secondary);
  --ui-padding: 0.8em 0.875em;
  --ui-gap: 0.5em;

  font-family: Roboto, sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text);
  line-height: 1.4;
  cursor: grab;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.flower * {
  box-sizing: border-box;
}

.flower-menu {
  position: absolute;
  left: var(--x, 0);
  top: var(--y, 0);
  background-color: var(--color-bg-tertiary);
  border: solid 1px rgba(200, 200, 200, 0.25);
  border-radius: var(--node-radius);
  cursor: default;
  display: flex;
  flex-direction: column;
}

.flower-menu-header input {
  background-color: rgba(200, 200, 200, 0.1);
  caret-color: var(--color-text);
  color: var(--color-text);
  padding: var(--ui-padding);
  border-radius: 0.5em;
  font-size: 0.9rem;
  outline: none;
  border: none;
}

.flower-menu-header input:focus {
  outline-color: var(--color-primary-hover);
  background-color: rgba(var(--color-primary-rgb), 0.1);
}

.flower-menu p {
  margin: 0;
}

.flower-menu:not(.open) {
  display: none;
}

.flower-menu-item {
  min-width: 200px;
  padding: var(--node-padding);
  position: relative;
}

.flower-menu-item:hover {
  background-color: rgba(100, 100, 100, 0.3);
  cursor: pointer;
}

.flower-menu-item-title {
  font-weight: bold;
  padding-bottom: 0.2em;
}

.flower-menu-item-desc {
  font-size: 0.75rem;
}

.node-wrapper {
  position: relative;
}

.node-wrapper > rect {
  rx: var(--node-radius);
  border-radius: var(--node-radius);
  fill: var(--node-bg-color);
}

.node-wrapper > rect {
  border-radius: var(--node-radius);
}

.node-socket {
  fill: none;
  stroke: var(--node-socket-connection-bg);
}

.node-socket.connected {
  stroke-width: 3;
}

.node-socket.connected:hover {
  stroke: var(--color-primary-hover);
  cursor: crosshair;
}

.node-socket-output,
.node-socket-input {
  fill: var(--node-socket-connection-bg);
}

.node-socket-output:hover {
  cursor: crosshair;
}

foreignObject {
  border: solid 1px var(--node-border-color);
  border-radius: var(--node-radius);
}

node {
  display: block;
  width: max-content;
  color: var(--node-color);
  padding-bottom: var(--ui-gap);
}

node-content {
  display: flex;
  flex-direction: column;
  gap: var(--ui-gap);
  padding: var(--node-padding);
}

node-content:empty {
  padding: 0;
}

node-content + node-content {
  padding-top: 0;
}

node-content p,
node-content label {
  margin: 0;
  font-size: 0.9rem;
  cursor: inherit;
}

node-title {
  display: block;
  font-size: var(--node-title-size);
  padding: var(--node-padding);
  border-bottom: solid 1px var(--node-border-color);
}

node input,
node select {
  background-color: var(--ui-bg-color);
  border-radius: var(--ui-radius);
  padding: var(--ui-padding);
  color: var(--ui-text-color);
  font-family: inherit;
  font-size: 0.9rem;
  outline: solid 1px transparent;
  border: none;
}

node select[multiple] {
  padding: 0;
}

node select > option {
  padding: 0 1em;
}

node input[type="number"] {
  font-variant-numeric: slashed-zero;
}

node input:focus {
  outline-color: var(--color-primary-hover);
  background-color: rgba(var(--color-primary-rgb), 0.1);
}
`;

export function addStyles() {
  const style = document.createElement("style");
  style.innerHTML = styles;
  document.head.appendChild(style);
}