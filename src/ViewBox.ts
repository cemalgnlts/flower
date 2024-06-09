class ViewBox {
  transform: SVGTransform;
  transformScale: SVGTransform;
  width: number;
  height: number;

  MIN_ZOOM = 0.3;
  MAX_ZOOM = 1.3;

  constructor(public rootEl: SVGGElement) {
    const ownerSvg = this.rootEl.ownerSVGElement!;

    this.width = ownerSvg.width.baseVal.value;
    this.height = ownerSvg.height.baseVal.value;

    this.transform = ownerSvg!.createSVGTransform();
    this.transformScale = ownerSvg!.createSVGTransform();

    this.rootEl.transform.baseVal.appendItem(this.transform);
    this.rootEl.transform.baseVal.appendItem(this.transformScale);
  }

  get zoom() {
    return this.transformScale.matrix.a;
  }

  get position() {
    return { x: this.transform.matrix.e, y: this.transform.matrix.f };
  }

  move(x: number, y: number) {
    this.transform.setTranslate(x, y);
  }

  moveBy(x: number, y: number) {
    const { x: curX, y: curY } = this.position;

    this.transform.setTranslate(curX + x, curY + y);
  }

  zoomBy(level: number, x: number = 0, y: number = 0) {
    const curLvl = this.zoom;
    const lvl = Math.max(Math.min(this.MAX_ZOOM, curLvl - level), this.MIN_ZOOM);

    const { x: curX, y: curY } = this.position;

    this.transform.setTranslate((lvl / curLvl) * (curX - x) + x, (lvl / curLvl) * (curY - y) + y);
    this.transformScale.setScale(lvl, lvl);
  }
}

export {
  ViewBox
}