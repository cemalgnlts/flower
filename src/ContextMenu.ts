import type { Node } from "./Node.ts";

interface ICtxMenuItem {
  title: string;
  desc: string;
  node: new () => Node;
}

interface IDOMElements {
  input: HTMLInputElement;
  nodes: HTMLDivElement;
  nodeOptions: HTMLDivElement;
}

class ContextMenu {
  readonly _element: HTMLDivElement;
  readonly dom: IDOMElements = {
    input: null!,
    nodes: null!,
    nodeOptions: null!
  };

  contextTarget: null | SVGGElement = null;

  registeredNodes: WeakMap<HTMLElement, new () => Node> = new WeakMap();

  addNode: (NodeCtor: new () => Node) => Node;
  getNodeById: (id: string) => Node | null;

  constructor(addNodeFun: (NodeCtor: new () => Node) => Node, getNodeById: (id: string) => Node | null) {
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

    this.dom.input = this._element.querySelector("input") as HTMLInputElement;
    this.dom.nodes = this._element.querySelector(".flower-menu-nodes") as HTMLInputElement;
    this.dom.nodeOptions = this._element.querySelector(".flower-menu-node-opts") as HTMLInputElement;

    this.addNode = addNodeFun;
    this.getNodeById = getNodeById;

    this.dom.nodeOptions.style.display = "none";

    this.dom.input.addEventListener("input", ev => this.onFilter((ev.currentTarget as HTMLInputElement).value));
    this.dom.nodes.addEventListener("click", this.onNodeSelect.bind(this));
    this.dom.nodeOptions.addEventListener("click", this.onOptionSelect.bind(this))
  }

  get x() {
    return parseFloat(this._element.style.getPropertyValue("--x"));
  }

  get y() {
    return parseFloat(this._element.style.getPropertyValue("--y"));
  }

  onFilter(value: string) {
    const activeList = this.dom.nodes.style.display === "" ? this.dom.nodes : this.dom.nodeOptions;
    const matches = Array.from(activeList.querySelectorAll("p"));

    for (const p of matches) {
      const isMatched = p.textContent!.toLocaleLowerCase().includes(value.toLowerCase());

      p.parentElement!.style.display = isMatched ? "" : "none";
    }
  }

  onNodeSelect(ev: MouseEvent) {
    let menuItem = ev.target as HTMLDivElement;

    if (!menuItem.classList.contains("flower-menu-item")) {
      const offsetParent = (menuItem as HTMLElement).offsetParent;
      if (offsetParent === null || !offsetParent.classList.contains("flower-menu-item")) return;

      menuItem = offsetParent as HTMLDivElement;
    }

    const node = this.registeredNodes.get(menuItem)!;
    this.addNode(node).moveTo(this.x, this.y);

    this.close();
  }

  onOptionSelect(ev: MouseEvent) {
    let menuItem = ev.target as HTMLDivElement;

    if (!menuItem.classList.contains("flower-menu-item")) {
      const offsetParent = (menuItem as HTMLElement).offsetParent;
      if (offsetParent === null || !offsetParent.classList.contains("flower-menu-item")) return;

      menuItem = offsetParent as HTMLDivElement;
    }

    const item = menuItem.firstElementChild!.textContent as "Delete";
    const node = this.getNodeById(this.contextTarget!.id)!;

    if (item === "Delete") {
      node.remove();
    }

    this.close();
  }

  registerNode(data: ICtxMenuItem) {
    const el = document.createElement("div");
    el.tabIndex = 0;
    el.classList.add("flower-menu-item");
    el.innerHTML = `<p class="flower-menu-item-title">${data.title}</p>
    <p class="flower-menu-item-desc">${data.desc}</p>`;

    this.registeredNodes.set(el, data.node);
    this.dom.nodes.appendChild(el);
  }

  show(x: number, y: number, group: null | SVGGElement = null) {
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
}

export {
  ContextMenu
}

export type {
  ICtxMenuItem
}