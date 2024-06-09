import type { Node } from "./Node.ts";

class Socket {
  _element: SVGPathElement;

  // socket-[input node id]_[output node id]_[output node socket index]
  // _id: string = "socket-0_0_0";

  _cachedValue: unknown = undefined;
  _pos = { x1: 0, y1: 0, x2: 0, y2: 0 };
  _isConnected = false;
  _isDirty = true;

  inputNode: null | Node = null;
  outputNode: null | Node = null;

  connectedSocketIndex = -1;

  constructor(x?: number, y?: number, source?: Node) {
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
    if (!this.inputNode) return undefined;

    if (this._isDirty) {
      this._cachedValue = this.inputNode.getValue();

      this._isDirty = false;
    }

    return this._cachedValue;
  }

  begin(x: number, y: number, source?: Node) {
    this._pos.x1 = x;
    this._pos.y1 = y;

    this._updatePos();

    if (source) this.inputNode = source;
  }

  end(x: number, y: number, target?: Node) {
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

  connectNodes(source: Node, target: Node, targetSourceIndex = 0, sourceSocketIndex = 0) {
    const sourcePortEl = source._group.querySelector(`.node-socket-output:nth-child(${sourceSocketIndex + 1}n)`) as SVGCircleElement;
    const targetPortEl = target._group.querySelector(`.node-socket-input:nth-child(${targetSourceIndex + 1}n)`) as SVGCircleElement;

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

  connected(target: Node) {
    this.outputNode = target;
    const id = this.id; // After '_isConnected' id gives the element id.

    this._isConnected = true;

    this._element.removeAttribute("stroke-dasharray");
    this._element.removeAttribute("marker-end");
    this._element.classList.add("connected");
    this._element.id = id;

    this.inputNode!.addOutputSocket(this);
    this.outputNode!.addInputSocket(this);

    this._updatePos();

    this.transmitValue();
  }

  transmitValue() {
    if (!this.inputNode || !this.outputNode) return;

    this._isDirty = true;

    const value = this.value;

    if (!value) return;

    this.outputNode!._onPreInput(this.inputNode!);
    this.outputNode!.notifyValueChanged();
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
}

export {
  Socket
}