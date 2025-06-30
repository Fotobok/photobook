class FotoImage {
    constructor(file) {
        this._file = file;
        this._img = new Image();
        this._pos = { x: 0, y: 0 };
        this._dims = { width: 0, height: 0 };
        this._crop = { x: 0, y: 0, width: 0, height: 0 };
        this._scale = { width: 0, height: 0 };
    }

    // Getters
    get file() { return this._file; }
    get img() { return this._img; }
    get pos() { return this._pos; }
    get dims() { return this._dims; }
    get crop() { return this._crop; }
    get scale() { return this._scale; }

    // Setters
    set file(file) { this._file = file; }
    set img(img) { this._img = img; }
    set pos(pos) { this._pos = pos; }
    set dims(dims) { this._dims = dims; }
    set crop(crop) { this._crop = crop; }
    set scale(scale) { this._scale = scale; }

    setPosition(x, y) { this._pos = { x: x, y: y }; }
    setDimensions(width, height) { this._dims = { width: width, height: height }; }
    setCrop(x, y, width, height) { this._crop = { x: x, y: y, width: width, height: height }; }
    setScale(width, height) { this._scale = { width: width, height: height }; }
}