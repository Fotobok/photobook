class FotoActions {
    constructor() {
        this._origDims = {w: 0, h: 0}
        this._actions = [];
    }

    get origDims() { return this._origDims; }
    set origDims(value) { this._origDims = value; }

    get actions() { return this._actions; }
    set actions(value) { this._actions = value; }

    storeActionMove(fromX, fromY, toX, toY) {
        this._actions.push({
            type: 'move',
            fromX: fromX,
            fromY: fromY,
            toX: toX,
            toY: toY,
            timestamp: Date.now()
        })
        console.log(this._actions);
    }

    storeActionScale(fromW, fromH, toW, toH) {
        this._actions.push({
            type: 'scale',
            fromW: fromW,
            fromH: fromH,
            toW: toW,
            toH: toH,
            timestamp: Date.now()
        })
        console.log(this._actions);
    }

    storeActionCrop(x, y, w, h) {
        this._actions.push({
            type: 'crop',
            x: x,
            y: y,
            w: w,
            h: h,
            timestamp: Date.now()
        })
        console.log(this._actions);
    }

    getScaleAndCropActions() {
        return this._actions.filter(
            action => action.type === 'scale' || action.type === 'crop'
        );
    }
}