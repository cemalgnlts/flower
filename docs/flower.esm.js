// src/ContextMenu.ts
var ContextMenu = class {
  _element;
  dom = {
    input: null,
    nodes: null,
    nodeOptions: null
  };
  contextTarget = null;
  registeredNodes = /* @__PURE__ */ new WeakMap();
  addNode;
  getNodeById;
  constructor(addNodeFun, getNodeById) {
    this._element = document.createElement("div");
    this._element.classList.add("flower-menu");
    this._element.innerHTML = `<div class="flower-menu-header">
      <input spellcheck="false" placeholder="Search node...">

      <div class="flower-menu-nodes"></div>

      <div class="flower-menu-node-opts">
        <div class="flower-menu-item">
          <p class="flower-menu-item-title">Delete</p>
        </div>
      </div>
    </div>`;
    this.dom.input = this._element.querySelector("input");
    this.dom.nodes = this._element.querySelector(".flower-menu-nodes");
    this.dom.nodeOptions = this._element.querySelector(".flower-menu-node-opts");
    this.addNode = addNodeFun;
    this.getNodeById = getNodeById;
    this.dom.nodeOptions.style.display = "none";
    this.dom.input.addEventListener("input", (ev) => this.onFilter(ev.currentTarget.value));
    this.dom.nodes.addEventListener("click", this.onNodeSelect.bind(this));
    this.dom.nodeOptions.addEventListener("click", this.onOptionSelect.bind(this));
  }
  get x() {
    return parseFloat(this._element.style.getPropertyValue("--x"));
  }
  get y() {
    return parseFloat(this._element.style.getPropertyValue("--y"));
  }
  onFilter(value) {
    const activeList = this.dom.nodes.style.display === "" ? this.dom.nodes : this.dom.nodeOptions;
    const matches = Array.from(activeList.querySelectorAll("p"));
    for (const p of matches) {
      const isMatched = p.textContent.toLocaleLowerCase().includes(value.toLowerCase());
      p.parentElement.style.display = isMatched ? "" : "none";
    }
  }
  onNodeSelect(ev) {
    let menuItem = ev.target;
    if (!menuItem.classList.contains("flower-menu-item")) {
      const offsetParent = menuItem.offsetParent;
      if (offsetParent === null || !offsetParent.classList.contains("flower-menu-item")) return;
      menuItem = offsetParent;
    }
    const node = this.registeredNodes.get(menuItem);
    this.addNode(node).moveTo(this.x, this.y);
    this.close();
  }
  onOptionSelect(ev) {
    let menuItem = ev.target;
    if (!menuItem.classList.contains("flower-menu-item")) {
      const offsetParent = menuItem.offsetParent;
      if (offsetParent === null || !offsetParent.classList.contains("flower-menu-item")) return;
      menuItem = offsetParent;
    }
    const item = menuItem.firstElementChild.textContent;
    const node = this.getNodeById(this.contextTarget.id);
    if (item === "Delete") {
      node.remove();
    }
    this.close();
  }
  registerNode(data) {
    const el = document.createElement("div");
    el.tabIndex = 0;
    el.classList.add("flower-menu-item");
    el.innerHTML = `<p class="flower-menu-item-title">${data.title}</p>
    <p class="flower-menu-item-desc">${data.desc}</p>`;
    this.registeredNodes.set(el, data.node);
    this.dom.nodes.appendChild(el);
  }
  show(x, y, group = null) {
    this._element.style.setProperty("--x", `${x}px`);
    this._element.style.setProperty("--y", `${y}px`);
    const display = this.dom.nodes.style.display;
    const targetDisplay = group !== null ? "none" : "";
    if (display !== targetDisplay) {
      const bool = group !== null;
      this.dom.nodes.style.display = bool ? "none" : "";
      this.dom.nodeOptions.style.display = bool ? "" : "none";
    }
    this._element.classList.add("open");
    this.dom.input.value = "";
    this.dom.input.focus();
    this.contextTarget = group;
  }
  close() {
    this._element.classList.remove("open");
  }
};

// src/Socket.ts
var Socket = class {
  _element;
  // socket-[input node id]_[output node id]_[output node socket index]
  // _id: string = "socket-0_0_0";
  _cachedValue = void 0;
  _pos = { x1: 0, y1: 0, x2: 0, y2: 0 };
  _isConnected = false;
  _isDirty = true;
  inputNode = null;
  outputNode = null;
  connectedSocketIndex = -1;
  constructor(x, y, source) {
    this._element = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this._element.setAttribute("marker-end", "url(#marker-arrow)");
    this._element.setAttribute("stroke-dasharray", "6");
    this._element.classList.add("node-socket");
    if (x && y) {
      this.begin(x, y, source);
      this.end(x, y);
    }
  }
  get id() {
    if (this._isConnected) {
      return this._element.id;
    }
    const inputNodeId = this.inputNode?.id.replace("node-", "") ?? 0;
    const outputNodeId = this.outputNode?.id.replace("node-", "") ?? 0;
    return `socket-${inputNodeId}_${outputNodeId}_${this.connectedSocketIndex}`;
  }
  get x1() {
    return this._pos.x1;
  }
  get y1() {
    return this._pos.y1;
  }
  get x2() {
    return this._pos.x2;
  }
  get y2() {
    return this._pos.y2;
  }
  get value() {
    if (!this.inputNode) return void 0;
    if (this._isDirty) {
      this._cachedValue = this.inputNode.getValue();
      this._isDirty = false;
    }
    return this._cachedValue;
  }
  begin(x, y, source) {
    this._pos.x1 = x;
    this._pos.y1 = y;
    this._updatePos();
    if (source) this.inputNode = source;
  }
  end(x, y, target) {
    this._pos.x2 = x;
    this._pos.y2 = y;
    this._updatePos();
    if (target) this.outputNode = target;
  }
  _updatePos() {
    let pathStr = "L";
    if (this._isConnected) {
      const offsetX = (this.x2 - this.x1) / 2;
      const lineMidX = this.x2 < this.x1 ? this.x2 + offsetX : this.x2 - offsetX;
      pathStr = `C${lineMidX} ${this.y1} ${lineMidX} ${this.y2}`;
    }
    this._element.setAttribute("d", `M${this.x1} ${this.y1} ${pathStr} ${this.x2} ${this.y2}`);
  }
  connectNodes(source, target, targetSourceIndex = 0, sourceSocketIndex = 0) {
    const sourcePortEl = source._group.querySelector(`.node-socket-output:nth-child(${sourceSocketIndex + 1}n)`);
    const targetPortEl = target._group.querySelector(`.node-socket-input:nth-child(${targetSourceIndex + 1}n)`);
    const x1 = source.x + sourcePortEl.cx.baseVal.value;
    const y1 = source.y + sourcePortEl.cy.baseVal.value;
    const x2 = target.x;
    const y2 = target.y + targetPortEl.cy.baseVal.value;
    this.connectedSocketIndex = targetSourceIndex;
    this._pos.x1 = x1;
    this._pos.y1 = y1;
    this._pos.x2 = x2;
    this._pos.y2 = y2;
    this.inputNode = source;
    this.connected(target);
  }
  connected(target) {
    this.outputNode = target;
    const id = this.id;
    this._isConnected = true;
    this._element.removeAttribute("stroke-dasharray");
    this._element.removeAttribute("marker-end");
    this._element.classList.add("connected");
    this._element.id = id;
    this.inputNode.addOutputSocket(this);
    this.outputNode.addInputSocket(this);
    this._updatePos();
    this.transmitValue();
  }
  transmitValue() {
    if (!this.inputNode || !this.outputNode) return;
    this._isDirty = true;
    const value = this.value;
    if (!value) return;
    this.outputNode._onPreInput(this.inputNode);
    this.outputNode.notifyValueChanged();
  }
  remove() {
    if (this._isConnected) {
      if (this.inputNode) this.inputNode.outputSockets.delete(this.id);
      if (this.outputNode) this.outputNode.inputSockets.delete(this.id);
    }
    this.inputNode = null;
    this.outputNode = null;
    this._element.remove();
  }
};

// src/ViewBox.ts
var ViewBox = class {
  constructor(rootEl) {
    this.rootEl = rootEl;
    const ownerSvg = this.rootEl.ownerSVGElement;
    this.width = ownerSvg.width.baseVal.value;
    this.height = ownerSvg.height.baseVal.value;
    this.transform = ownerSvg.createSVGTransform();
    this.transformScale = ownerSvg.createSVGTransform();
    this.rootEl.transform.baseVal.appendItem(this.transform);
    this.rootEl.transform.baseVal.appendItem(this.transformScale);
  }
  transform;
  transformScale;
  width;
  height;
  MIN_ZOOM = 0.3;
  MAX_ZOOM = 1.3;
  get zoom() {
    return this.transformScale.matrix.a;
  }
  get position() {
    return { x: this.transform.matrix.e, y: this.transform.matrix.f };
  }
  move(x, y) {
    this.transform.setTranslate(x, y);
  }
  moveBy(x, y) {
    const { x: curX, y: curY } = this.position;
    this.transform.setTranslate(curX + x, curY + y);
  }
  zoomBy(level, x = 0, y = 0) {
    const curLvl = this.zoom;
    const lvl = Math.max(Math.min(this.MAX_ZOOM, curLvl - level), this.MIN_ZOOM);
    const { x: curX, y: curY } = this.position;
    this.transform.setTranslate(lvl / curLvl * (curX - x) + x, lvl / curLvl * (curY - y) + y);
    this.transformScale.setScale(lvl, lvl);
  }
};

// src/styles.ts
var styles = `.flower {
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
function addStyles() {
  const style = document.createElement("style");
  style.innerHTML = styles;
  document.head.appendChild(style);
}

// src/Flower.ts
var Flower = class {
  pointerState = {
    isDragging: false,
    dragging: { x: 0, y: 0 },
    pos: { x: 0, y: 0 },
    movement: { x: 0, y: 0 },
    target: null
  };
  // HTML elements.
  dom = {
    svg: null,
    workbench: null,
    sockets: null
  };
  offsetX = 0;
  offsetY = 0;
  nextNodeId = 0;
  viewBox;
  contextMenu;
  nodes = /* @__PURE__ */ new Map();
  constructor(container) {
    addStyles();
    container.classList.add("flower");
    const width = container.clientWidth;
    const height = container.clientHeight;
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.viewBox.baseVal.x = 0;
    svgEl.viewBox.baseVal.y = 0;
    svgEl.viewBox.baseVal.width = width;
    svgEl.viewBox.baseVal.height = height;
    svgEl.width.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, width);
    svgEl.height.baseVal.newValueSpecifiedUnits(SVGLength.SVG_LENGTHTYPE_PX, height);
    svgEl.classList.add("flower-editor");
    svgEl.innerHTML = `<defs>
    <!-- A marker to be used as an arrowhead -->
    <marker
      id="marker-arrow"
      viewBox="0 0 24 24"
      refX="20"
      refY="12"
      markerWidth="24"
      markerHeight="24"
      fill="none"
      stroke="currentColor"
      orient="auto">
        <path stroke-linecap="round" stroke-width="1" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5">
    </marker>
  
    <pattern x="25" y="25" width="50" height="50" patternUnits="userSpaceOnUse" id="gridPattern">
      <rect x="10" y="10" width="1" height="1" fill="#aaa">
    </pattern>
  </defs>
  <g id="viewbox">
    <g id="bg" style="pointer-events: none">
      <rect x="-250%" y="-250%" width="500%" height="500%" fill="url(#gridPattern)">
    </g>
    <g id="sockets"></g>
    <g id="workbench"></g>
  </g>`;
    this.dom.workbench = svgEl.getElementById("workbench");
    this.dom.sockets = svgEl.getElementById("sockets");
    this.viewBox = new ViewBox(svgEl.getElementById("viewbox"));
    this.dom.svg = svgEl;
    this.contextMenu = new ContextMenu(this.addNode.bind(this), this.getNodeById.bind(this));
    container.appendChild(svgEl);
    container.appendChild(this.contextMenu._element);
    const { left, top } = svgEl.getBoundingClientRect();
    this.offsetX = left;
    this.offsetY = top;
    svgEl.addEventListener("pointerdown", this.onPointerDown.bind(this));
    svgEl.addEventListener("pointermove", this.onPointerMove.bind(this));
    svgEl.addEventListener("pointerup", this.onPointerCancel.bind(this));
    svgEl.addEventListener("pointercancel", this.onPointerCancel.bind(this));
    svgEl.addEventListener("touchstart", (ev) => ev.preventDefault());
    svgEl.addEventListener("wheel", this.onWheel.bind(this));
    svgEl.addEventListener("contextmenu", this.onContextMenu.bind(this));
    svgEl.addEventListener("flower-render", (ev) => {
      const node = ev.detail.node;
      const renderedContent = node.render();
      const foreignObject = node.querySelector("foreignObject");
      if (renderedContent instanceof HTMLElement) {
        foreignObject.appendChild(renderedContent);
      } else if (typeof renderedContent === "string") {
        foreignObject.innerHTML = renderedContent;
      } else {
        throw Error("Unknown render value: " + renderedContent + ". Only string or HTMLElement");
      }
    });
    svgEl.addEventListener("flower-remove", (ev) => {
      const node = ev.detail.node;
      node.inputSockets.forEach((socket) => socket.remove());
      node.outputSockets.forEach((socket) => socket.remove());
      this.nodes.delete(node.id);
      node._group.remove();
    });
  }
  onPointerDown(ev) {
    if (ev.button !== 0) return;
    const { clientX, clientY, button, target } = ev;
    const absX = clientX - this.offsetX;
    const absY = clientY - this.offsetY;
    this.pointerState.dragging.x = this.pointerState.pos.x - absX;
    this.pointerState.dragging.y = this.pointerState.pos.y - absY;
    this.pointerState.isDragging = button === 0;
    this.dom.svg.setPointerCapture(ev.pointerId);
    this.dom.svg.style.cursor = "grabbing";
    this.contextMenu.close();
    if (target instanceof SVGCircleElement && target.classList.contains("node-socket-output")) {
      this.dom.svg.style.cursor = "crosshair";
      const node = this.nodes.get(target.parentElement.id);
      const x1 = node.x + target.cx.baseVal.value;
      const y1 = node.y + target.cy.baseVal.value;
      const socket = new Socket(x1, y1, node);
      this.dom.sockets.appendChild(socket._element);
      this.pointerState.target = socket;
    }
    if (this.pointerState.target) return;
    if (target instanceof SVGPathElement && target.classList.contains("node-socket")) {
      const id = target.id;
      let nodeId = id.replace("socket-", "node-");
      nodeId = nodeId.slice(0, nodeId.indexOf("_"));
      this.nodes.get(nodeId).outputSockets.get(id).remove();
      return;
    }
    const path = ev.composedPath();
    const [group] = path.filter((el) => el.nodeName === "g" && el.classList.contains("node-wrapper"));
    if (!group) return;
    this.pointerState.target = group;
  }
  onPointerMove(ev) {
    const { x: prevX, y: prevY } = this.pointerState.pos;
    this.pointerState.movement.x = ev.clientX - prevX;
    this.pointerState.movement.y = ev.clientY - prevY;
    this.pointerState.pos.x = ev.clientX;
    this.pointerState.pos.y = ev.clientY;
    if (!this.pointerState.isDragging) return;
    if (this.pointerState.target === null) {
      this.viewBox.moveBy(this.pointerState.movement.x, this.pointerState.movement.y);
      return;
    }
    const target = this.pointerState.target;
    if (target instanceof SVGGElement) {
      const node = this.nodes.get(target.id);
      this.dom.workbench.appendChild(target);
      node.moveBy(this.pointerState.movement.x, this.pointerState.movement.y);
    } else if (target instanceof Socket) {
      const absX = ev.clientX - this.offsetX - this.viewBox.position.x;
      const absY = ev.clientY - this.offsetY - this.viewBox.position.y;
      const x = (absX + this.pointerState.movement.x) / this.viewBox.zoom;
      const y = (absY + this.pointerState.movement.y) / this.viewBox.zoom;
      target.end(x, y);
    }
  }
  onPointerCancel({ clientX, clientY }) {
    this.pointerState.dragging = { x: 0, y: 0 };
    this.pointerState.isDragging = false;
    this.dom.svg.style.cursor = "";
    if (!(this.pointerState.target instanceof Socket)) {
      this.pointerState.target = null;
      return;
    }
    const socket = this.pointerState.target;
    this.pointerState.target = null;
    const absX = clientX - this.offsetX;
    const absY = clientY - this.offsetY;
    const rect = this.dom.svg.createSVGRect();
    rect.x = absX - 5;
    rect.y = absY - 5;
    rect.width = 10;
    rect.height = 10;
    const intersections = Array.from(this.dom.svg.getIntersectionList(rect, this.dom.svg));
    const inputIdx = intersections.reverse().findIndex((el) => el.classList.contains("node-socket-input"));
    if (inputIdx === -1) {
      socket.remove();
      return;
    }
    const inputCircle = intersections[inputIdx];
    const outputNode = this.nodes.get(inputCircle.parentElement.id);
    socket.connectedSocketIndex = +inputCircle.dataset.index;
    socket.end(outputNode.x, outputNode.y + inputCircle.cy.baseVal.value, outputNode);
    if (outputNode.inputSockets.has(socket.id)) {
      socket.remove();
      return;
    }
    socket.connected(outputNode);
  }
  onWheel(ev) {
    const { clientX, clientY, deltaY } = ev;
    const scale = deltaY * 1e-3;
    const absX = clientX - this.offsetX;
    const absY = clientY - this.offsetY;
    this.viewBox.zoomBy(scale, absX, absY);
  }
  onContextMenu(ev) {
    ev.preventDefault();
    const { clientX, clientY } = ev;
    const absX = clientX - this.offsetX;
    const absY = clientY - this.offsetY;
    const target = ev.target;
    if (this.dom.svg === target) {
      this.contextMenu.show(absX, absY);
      return;
    }
    if (!target.offsetParent || !target.offsetParent.parentElement) {
      this.contextMenu.close();
      return;
    }
    const nodeGroup = target.offsetParent.parentElement;
    this.contextMenu.show(absX, absY, nodeGroup);
  }
  // Public
  addNode(NodeCtor) {
    const node = new NodeCtor();
    node._init(this.dom.svg, this.viewBox);
    const nodeId = `node-${this.nextNodeId++}`;
    const nodeContent = node.render();
    node._group.id = nodeId;
    const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    if (nodeContent instanceof HTMLElement) {
      foreignObject.appendChild(nodeContent);
    } else if (typeof nodeContent === "string") {
      foreignObject.innerHTML = nodeContent;
    } else {
      throw Error("Unknown render value(" + nodeContent + "), only string or HTMLElement.");
    }
    node._group.appendChild(foreignObject);
    this.dom.workbench.appendChild(node._group);
    const content = foreignObject.firstElementChild;
    const bg = node._group.firstElementChild;
    node.width = content.offsetWidth;
    node.height = content.offsetHeight;
    foreignObject.width.baseVal.value = node.width;
    foreignObject.height.baseVal.value = node.height;
    bg.width.baseVal.value = node.width;
    bg.height.baseVal.value = node.height;
    content.addEventListener("input", () => node.notifyValueChanged());
    this.nodes.set(nodeId, node);
    node._ready();
    return node;
  }
  registerNode(item) {
    this.contextMenu.registerNode(item);
  }
  getNodeById(id) {
    return this.nodes.get(id) ?? null;
  }
};

// src/Node.ts
var Node = class {
  width = 0;
  height = 0;
  inputSockets = /* @__PURE__ */ new Map();
  outputSockets = /* @__PURE__ */ new Map();
  _inputSize = 0;
  _outputSize = 0;
  _group;
  _transform;
  _viewBox;
  // Public
  moveTo(x, y) {
    const zoom = this._viewBox.zoom;
    const xAbs = x / zoom;
    const yAbs = y / zoom;
    for (const socket of this.outputSockets.values()) {
      socket.begin(socket.x1 + xAbs, socket.y1 + yAbs);
    }
    for (const socket of this.inputSockets.values()) {
      socket.end(socket.x2 + xAbs, socket.y2 + yAbs);
    }
    this._transform.setTranslate(xAbs, yAbs);
  }
  moveBy(x, y) {
    const { e, f } = this._transform.matrix;
    const zoom = this._viewBox.zoom;
    const xAbs = x / zoom;
    const yAbs = y / zoom;
    for (const socket of this.outputSockets.values()) {
      socket.begin(socket.x1 + xAbs, socket.y1 + yAbs);
    }
    for (const socket of this.inputSockets.values()) {
      socket.end(socket.x2 + xAbs, socket.y2 + yAbs);
    }
    this._transform.setTranslate(e + xAbs, f + yAbs);
  }
  setAnchor(anchor, offsetX = 0, offsetY = 0) {
    let x = -1;
    let y = -1;
    const boxW = this._viewBox.width;
    const boxH = this._viewBox.height;
    const w = this.width;
    const h = this.height;
    const anchorLower = anchor.toLowerCase();
    if (anchorLower.startsWith("left")) {
      x = 0;
    } else if (anchorLower.startsWith("center")) {
      x = boxW / 2 - w / 2;
    } else if (anchorLower.startsWith("right")) {
      x = boxW - w;
    }
    if (anchorLower.endsWith("top")) {
      y = 0;
    } else if (anchorLower.endsWith("center")) {
      y = boxH / 2 - h / 2;
    } else if (anchorLower.endsWith("bottom")) {
      y = boxH - h;
    }
    if (x === -1 || y === -1) {
      throw Error("Unknown anchor pos: " + anchor);
    }
    this.moveTo(x + offsetX, y + offsetY);
  }
  requestRender() {
    const event = new CustomEvent("flower-render", {
      detail: {
        node: this
      }
    });
    this._group.ownerSVGElement.dispatchEvent(event);
  }
  addInputSocket(socket) {
    this.inputSockets.set(socket.id, socket);
  }
  addOutputSocket(socket) {
    this.outputSockets.set(socket.id, socket);
  }
  getValue() {
    if (this.onOutput) return this.onOutput();
    const contents = this._group.querySelectorAll("node-content");
    const size = contents.length;
    const values = [];
    for (let i = 0; i < size; i++) {
      const inputs = contents[i].querySelectorAll("input");
      const inputSize = inputs.length;
      for (let j = 0; j < inputSize; j++) {
        values.push(inputs[j].value ?? inputs[j].defaultValue);
      }
    }
    return values;
  }
  connectToNode(target, targetSocketIndex = 0, fromSocketIndex = 0) {
    const socket = new Socket();
    socket.connectNodes(this, target, targetSocketIndex, fromSocketIndex);
    document.getElementById("sockets").appendChild(socket._element);
  }
  notifyValueChanged() {
    const sockets = Array.from(this.outputSockets.values());
    const size = sockets.length;
    for (let i = 0; i < size; i++) {
      sockets[i].transmitValue();
    }
  }
  getElementById(id) {
    return this._group.querySelector(`[data-local-id=${id}]`);
  }
  querySelector(selectors) {
    return this._group.querySelector(selectors);
  }
  querySelectorAll(selectors) {
    return this._group.querySelectorAll(selectors);
  }
  remove() {
    this._group.ownerSVGElement.dispatchEvent(new CustomEvent("flower-remove", { detail: { node: this } }));
  }
  // Getters
  get id() {
    return this._group.id;
  }
  get x() {
    return this._transform.matrix.e;
  }
  get y() {
    return this._transform.matrix.f;
  }
  // Private
  _init(svgEl, viewBox) {
    this._transform = svgEl.createSVGTransform();
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.transform.baseVal.appendItem(this._transform);
    group.classList.add("node-wrapper");
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    group.appendChild(bg);
    this._viewBox = viewBox;
    this._group = group;
  }
  _ready() {
    const inputs = this._group.querySelectorAll("[input]");
    const outputs = this._group.querySelectorAll("[output]");
    this._inputSize = inputs.length;
    this._outputSize = outputs.length;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs.item(i);
      const top = input.offsetTop + input.clientHeight / 2;
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.classList.add("node-socket-input");
      circle.cx.baseVal.value = 0;
      circle.cy.baseVal.value = top;
      circle.r.baseVal.value = 6;
      circle.dataset.index = String(i);
      frag.appendChild(circle);
    }
    for (let i = 0; i < outputs.length; i++) {
      const output = outputs.item(i);
      const top = output.offsetTop + output.clientHeight / 2;
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.classList.add("node-socket-output");
      circle.cx.baseVal.value = this.width;
      circle.cy.baseVal.value = top;
      circle.r.baseVal.value = 6;
      frag.appendChild(circle);
    }
    this._group.appendChild(frag);
  }
  _onPreInput(sourceNode) {
    if (!this.onInput) throw Error(`${this.name} node not implements 'onInput' function.`);
    const values = Array.from({ length: this._inputSize }, () => void 0);
    const sockets = Array.from(this.inputSockets.values());
    const size = sockets.length;
    for (let i = 0; i < size; i++) {
      const socket = sockets[i];
      if (values[socket.connectedSocketIndex] !== void 0) {
        const changedNodeSocketId = `socket-${sourceNode.id.replace("node-", "")}_`;
        if (!socket.id.startsWith(changedNodeSocketId)) continue;
      }
      values[socket.connectedSocketIndex] = socket.value;
    }
    this.onInput(values.flat(), sourceNode);
  }
};

// src/NodeBuilder.ts
var NodeBuilder = class {
  constructor(name = "[unnamed]") {
    this.name = name;
    this.root = document.createElement("node");
    this.content = document.createElement("node-content");
  }
  root;
  content;
  _onPreInput = null;
  _onPreOutput = null;
  elements = /* @__PURE__ */ new Map();
  setTitle(text) {
    const titleEl = this.root.querySelector("node-title");
    if (titleEl) {
      titleEl.textContent = text;
      return this;
    }
    const el = document.createElement("node-title");
    el.textContent = text;
    this.root.prepend(el);
    return this;
  }
  input() {
    this.content = document.createElement("node-content");
    this.content.setAttribute("input", "");
    this.root.appendChild(this.content);
    return this;
  }
  output() {
    this.content = document.createElement("node-content");
    this.content.setAttribute("output", "");
    this.root.appendChild(this.content);
    return this;
  }
  addTextFieldElement(attrs) {
    const el = document.createElement("input");
    if (attrs.id) {
      this.elements.set(attrs.id, el);
      el.dataset.localId = attrs.id;
      delete attrs.id;
    }
    if (attrs.value) {
      el.setAttribute("value", attrs.value);
      delete attrs.value;
    }
    if (attrs.defaultValue) {
      el.setAttribute("defaultValue", attrs.defaultValue);
      delete attrs.defaultValue;
    }
    Object.assign(el, attrs);
    this.content.appendChild(el);
    return this;
  }
  onInput(fun) {
    this._onPreInput = fun;
    return this;
  }
  onOutput(fun) {
    this._onPreOutput = fun;
    return this;
  }
  build() {
    const name = this.name;
    const root = this.root;
    const elements = this.elements;
    const _onPreInput = this._onPreInput;
    const _onPreOutput = this._onPreOutput;
    const node = class extends Node {
      name = name;
      elements = new Map(elements);
      render() {
        const rootClone = root.cloneNode(true);
        this.elements.forEach((_val, key) => {
          this.elements.set(key, rootClone.querySelector(`[data-local-id=${key}]`));
        });
        return rootClone;
      }
    };
    if (_onPreInput !== null) {
      Object.defineProperty(node.prototype, "onInput", {
        value(value, sourceNode) {
          _onPreInput.call(this, value, this.elements, sourceNode);
        }
      });
    }
    if (_onPreOutput !== null) {
      Object.defineProperty(node.prototype, "onOutput", {
        value() {
          return _onPreOutput.call(this, this.elements);
        }
      });
    }
    return node;
  }
};
export {
  Flower,
  Node,
  NodeBuilder
};
