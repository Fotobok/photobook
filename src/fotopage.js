class FotoPage {
    constructor(x, y, width, height) {
        this._pos = { x: x, y: y };
        this._dims = { w: width, h: height };
    }

    get pos() { return this._pos; }
    get dims() { return this._dims; }

    set pos(value) { this._pos = value; }
    set dims(value) { this._dims = value; }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#bbb";
        ctx.lineWidth = 3 / zoom;
        ctx.fillRect(this.pos.x, this.pos.y, this.dims.w, this.dims.h);
        ctx.strokeRect(this.pos.x, this.pos.y, this.dims.w, this.dims.h);
        ctx.restore();
    }

    center(doublepage) {
        console.log(doublepage)
        if (doublepage) {
            panX = (canvas.width / 2) - (this.dims.w * zoom);
            panY = (canvas.height / 2) - (this.dims.h * zoom / 2);
        } else {
            panX = (canvas.width / 2) - (this.dims.w * zoom / 2);
            panY = (canvas.height / 2) - (this.dims.h * zoom / 2);
        }
    }

    setPositionAndDims(x, y, width, height) {
        this._pos = { x: x, y: y };
        this._dims = { w: width, h: height };
    }

}