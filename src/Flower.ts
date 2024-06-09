import { ContextMenu, type ICtxMenuItem } from "./ContextMenu.ts";
import type { Node } from "./Node.ts";

import { Socket } from "./Socket.ts";

import { ViewBox } from "./ViewBox.ts";
import { addStyles } from "./styles.ts";

type InteractableSVGEl = SVGRectElement | SVGGElement;

interface IPointerState {
  isDragging: boolean;
  dragging: { x: number, y: number };
  pos: { x: number, y: number };
  movement: { x: number, y: number };
  target: null | InteractableSVGEl | Socket;
}

interface DOMElements {
  svg: SVGSVGElement;
  workbench: SVGGElement;
  sockets: SVGGElement;
}

class Flower {
  readonly pointerState: IPointerState = {
    isDragging: false,
    dragging: { x: 0, y: 0 },
    pos: { x: 0, y: 0 },
    movement: { x: 0, y: 0 },
    target: null
  };

  // HTML elements.
  readonly dom: DOMElements = {
    svg: null!,
    workbench: null!,
    sockets: null!
  };

  offsetX = 0;
  offsetY = 0;
  nextNodeId = 0;

  readonly viewBox: ViewBox;
  readonly contextMenu: ContextMenu;
  readonly nodes = new Map<string, Node>();

  constructor(container: HTMLElement) {
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

    this.dom.workbench = svgEl.getElementById("workbench") as SVGGElement;
    this.dom.sockets = svgEl.getElementById("sockets") as SVGGElement;

    this.viewBox = new ViewBox(svgEl.getElementById("viewbox") as SVGGElement);
    this.dom.svg = svgEl;

    this.contextMenu = new ContextMenu(this.addNode.bind(this), this.getNodeById.bind(this));

    container.appendChild(svgEl);
    container.appendChild(this.contextMenu._element);

    const { left, top } = svgEl.getBoundingClientRect();

    this.offsetX = left;
    this.offsetY = top;

    svgEl.addEventListener("pointerdown", this.onPointerDown.bind(this));
    svgEl.addEventListener("pointermove", this.onPointerMove.bind(this))
    svgEl.addEventListener("pointerup", this.onPointerCancel.bind(this));
    svgEl.addEventListener("pointercancel", this.onPointerCancel.bind(this));
    svgEl.addEventListener("touchstart", ev => ev.preventDefault());
    // svgEl.addEventListener("blur", this.onPointerCancel.bind(this));

    svgEl.addEventListener("wheel", this.onWheel.bind(this));

    svgEl.addEventListener("contextmenu", this.onContextMenu.bind(this));

    // @ts-expect-error Custom event listener.
    svgEl.addEventListener("flower-render", (ev: CustomEvent<{ node: Node }>) => {
      const node = ev.detail.node;
      const renderedContent = node.render();

      const foreignObject = node.querySelector("foreignObject") as SVGForeignObjectElement;

      if (renderedContent instanceof HTMLElement) {
        foreignObject.appendChild(renderedContent);
      } else if (typeof renderedContent === "string") {
        foreignObject.innerHTML = renderedContent;
      } else {
        throw Error("Unknown render value: " + renderedContent + ". Only string or HTMLElement")
      }
    });

    // @ts-expect-error Custom event listener.
    svgEl.addEventListener("flower-remove", (ev: CustomEvent<{ node: Node }>) => {
      const node = ev.detail.node;

      node.inputSockets.forEach(socket => socket.remove());
      node.outputSockets.forEach(socket => socket.remove());

      this.nodes.delete(node.id);
      node._group.remove();
    });
  }

  onPointerDown(ev: PointerEvent) {
    if (ev.button !== 0) return; // Only left click.

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

      const node = this.nodes.get(target.parentElement!.id)!;
      const x1 = node.x + (target as SVGCircleElement).cx.baseVal.value;
      const y1 = node.y + (target as SVGCircleElement).cy.baseVal.value;

      const socket = new Socket(x1, y1, node);

      this.dom.sockets.appendChild(socket._element);
      this.pointerState.target = socket;
    }

    if (this.pointerState.target) return;

    // Remove socket when touched.
    if (target instanceof SVGPathElement && target.classList.contains("node-socket")) {
      const id = target.id;
      let nodeId = id.replace("socket-", "node-");
      nodeId = nodeId.slice(0, nodeId.indexOf("_"));

      this.nodes.get(nodeId)!.outputSockets.get(id)!.remove();
      return;
    }

    const path = ev.composedPath() as Element[];
    const [group] = path.filter(el => el.nodeName === "g" && el.classList.contains("node-wrapper"));

    // Skip if not <g class="node-wrapper"> elements.
    if (!group) return;

    this.pointerState.target = group as SVGGElement;
  }

  onPointerMove(ev: PointerEvent) {
    // Calculate mouse delta
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

    const target = this.pointerState.target as SVGGElement | Socket;

    if (target instanceof SVGGElement) {
      const node = this.nodes.get(target.id)!;
      this.dom.workbench.appendChild(target)!; // bring node to forward.

      node.moveBy(this.pointerState.movement.x, this.pointerState.movement.y);
    } else if (target instanceof Socket) {
      const absX = ev.clientX - this.offsetX - this.viewBox.position.x;
      const absY = ev.clientY - this.offsetY - this.viewBox.position.y;
      const x = (absX + this.pointerState.movement.x) / this.viewBox.zoom;
      const y = (absY + this.pointerState.movement.y) / this.viewBox.zoom;

      target.end(x, y);
    }
  }

  onPointerCancel({ clientX, clientY }: PointerEvent) {
    this.pointerState.dragging = { x: 0, y: 0 };
    this.pointerState.isDragging = false;
    this.dom.svg.style.cursor = "";

    if (!(this.pointerState.target instanceof Socket)) {
      this.pointerState.target = null;

      return;
    }

    const socket = this.pointerState.target as Socket;
    this.pointerState.target = null;

    const absX = clientX - this.offsetX;
    const absY = clientY - this.offsetY;

    // Create area with centered of mouse.
    const rect = this.dom.svg.createSVGRect();
    rect.x = absX - 5;
    rect.y = absY - 5;
    rect.width = 10;
    rect.height = 10;

    const intersections = Array.from(this.dom.svg.getIntersectionList(rect, this.dom.svg));

    const inputIdx = intersections.reverse()
      .findIndex(el => el.classList.contains("node-socket-input"));

    if (inputIdx === -1) {
      socket.remove();

      return;
    }

    const inputCircle = intersections[inputIdx] as SVGCircleElement;
    const outputNode = this.nodes.get(inputCircle.parentElement!.id)!;

    socket.connectedSocketIndex = +(inputCircle.dataset.index as string);
    socket.end(outputNode.x, outputNode.y + inputCircle.cy.baseVal.value, outputNode);

    if (outputNode.inputSockets.has(socket.id)) {
      socket.remove();

      return;
    }

    socket.connected(outputNode);
  }

  onWheel(ev: WheelEvent) {
    const { clientX, clientY, deltaY } = ev;

    const scale = deltaY * 0.001;

    const absX = clientX - this.offsetX;
    const absY = clientY - this.offsetY;

    this.viewBox.zoomBy(scale, absX, absY);
  }

  onContextMenu(ev: MouseEvent) {
    ev.preventDefault();

    const { clientX, clientY } = ev;

    const absX = clientX - this.offsetX;
    const absY = clientY - this.offsetY;

    const target = ev.target as (SVGSVGElement | HTMLElement) & { offsetParent: undefined | HTMLElement };

    if (this.dom.svg === target) {
      this.contextMenu.show(absX, absY);

      return;
    }

    if (!target.offsetParent || !target.offsetParent.parentElement) {
      this.contextMenu.close();

      return;
    }

    const nodeGroup = target.offsetParent.parentElement as unknown as SVGGElement;
    this.contextMenu.show(absX, absY, nodeGroup);
  }

  // Public

  addNode(NodeCtor: new () => Node) {
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

    const content = foreignObject.firstElementChild as HTMLElement;
    const bg = node._group.firstElementChild as SVGRectElement;

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

  registerNode(item: ICtxMenuItem) {
    this.contextMenu.registerNode(item);
  }

  getNodeById(id: string) {
    return this.nodes.get(id) ?? null;
  }
}

export {
  Flower
};
