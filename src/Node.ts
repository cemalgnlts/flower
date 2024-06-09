import { Socket } from "./Socket.ts";
import type { ViewBox } from "./ViewBox.ts";

type AnchorPos = "LeftTop" | "LeftCenter" | "LeftBottom"
  | "CenterTop" | "CenterCenter" | "CenterBottom"
  | "RightTop" | "RightCenter" | "RightBottom";

abstract class Node {
  width = 0;
  height = 0;

  inputSockets: Map<string, Socket> = new Map();
  outputSockets: Map<string, Socket> = new Map();

  _inputSize = 0;
  _outputSize = 0;

  _group!: SVGGElement;
  _transform!: SVGTransform;
  _viewBox!: ViewBox;

  abstract name: string;

  abstract render(): string | HTMLElement;

  // Overridable
  onInput?(value: unknown, node: Node): void;
  onOutput?(): unknown;

  // Public

  moveTo(x: number, y: number) {
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

  moveBy(x: number, y: number) {
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

  setAnchor(anchor: AnchorPos, offsetX = 0, offsetY = 0) {
    let x = -1;
    let y = -1;

    const boxW = this._viewBox.width;
    const boxH = this._viewBox.height;
    const w = this.width;
    const h = this.height;
    const anchorLower = anchor.toLowerCase() as Lowercase<AnchorPos>;

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
    const event = new CustomEvent<{ node: Node }>("flower-render", {
      detail: {
        node: this
      }
    });

    this._group.ownerSVGElement!.dispatchEvent(event);
  }

  addInputSocket(socket: Socket) {
    this.inputSockets.set(socket.id, socket);
  }

  addOutputSocket(socket: Socket) {
    this.outputSockets.set(socket.id, socket);
  }

  getValue(): Array<unknown> | unknown {
    if(this.onOutput) return this.onOutput();
    
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

  connectToNode(target: Node, targetSocketIndex = 0, fromSocketIndex = 0) {
    const socket = new Socket();
    socket.connectNodes(this, target, targetSocketIndex, fromSocketIndex);

    document.getElementById("sockets")!.appendChild(socket._element);
  }

  notifyValueChanged() {
    const sockets = Array.from(this.outputSockets.values());
    const size = sockets.length;

    for (let i = 0; i < size; i++) {
      sockets[i].transmitValue();
    }
  }

  getElementById(id: string) {
    return this._group.querySelector(`[data-local-id=${id}]`);
  }

  querySelector(selectors: string) {
    return this._group.querySelector(selectors);
  }

  querySelectorAll(selectors: string) {
    return this._group.querySelectorAll(selectors);
  }

  remove() {
    this._group.ownerSVGElement!.dispatchEvent(new CustomEvent("flower-remove", { detail: { node: this } }));
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

  _init(svgEl: SVGSVGElement, viewBox: ViewBox) {
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
    const inputs = this._group.querySelectorAll("[input]") as NodeListOf<HTMLDivElement>;
    const outputs = this._group.querySelectorAll("[output]") as NodeListOf<HTMLDivElement>;

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

  _onPreInput(sourceNode: Node): void {
    if (!this.onInput) throw Error(`${this.name} node not implements 'onInput' function.`);

    const values = Array.from({ length: this._inputSize }, () => undefined) as Array<unknown>;
    const sockets = Array.from(this.inputSockets.values());
    const size = sockets.length;

    for (let i = 0; i < size; i++) {
      const socket = sockets[i];

      // If same node gets more then one socket.
      // use value from changed node.
      if (values[socket.connectedSocketIndex] !== undefined) {
        const changedNodeSocketId = `socket-${sourceNode.id.replace("node-", "")}_`;

        if (!socket.id.startsWith(changedNodeSocketId)) continue;
      }

      values[socket.connectedSocketIndex] = socket.value;
    }

    this.onInput(values.flat(), sourceNode);
  }
}

export {
  Node
}