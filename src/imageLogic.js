// imageLogic.js

// Ensure images is defined globally before any code uses it
if (typeof images === "undefined") var images = [];
if (typeof selectedImageIdx === "undefined") var selectedImageIdx = null;


function loadImage(image, mouse) {
    const margin = 40;
    let maxW = doublepage ? fotopages[0].dims.w / 2 - margin * 2 : fotopages[0].dims.w - margin * 2;
    const maxH = fotopages[0].dims.h - margin * 2;
    let w = image.img.width, h = image.img.height, aspect = w / h;
    if (w > maxW) { w = maxW; h = w / aspect; }
    if (h > maxH) { h = maxH; w = h * aspect; }
    image.setPosition(mouse.x - w/2 + images.length * 30, mouse.y - h/2 + images.length * 30)
    image.setDimensions(w,  h)
    images.push(image);
}

function loadImageFile(file, mouse) {
  if (!file.type.startsWith('image/')) return;
  const image = new FotoImage(file); // Pass file to constructor and use 'new'
  image.img.onload = () => {
    loadImage(image, mouse);
    draw();
  };
  image.img.src = URL.createObjectURL(file);

}

function handleImageDrag(mouse, dragging, offsetX, offsetY, canvas, doublepage, draw) {
    const image = images[dragging];
    let newX = mouse.x - offsetX, newY = mouse.y - offsetY, snapDist = 10;

    // Snap to canvas edges for all fotopages
    for (let page of fotopages) {
        // Snap to left and top edges
        if (Math.abs(newX - page.pos.x) < snapDist) newX = page.pos.x;
        if (Math.abs(newY - page.pos.y) < snapDist) newY = page.pos.y;
        // Snap to right and bottom edges
        if (Math.abs((page.pos.x + page.dims.w) - (newX + image.dims.width)) < snapDist)
            newX = page.pos.x + page.dims.w - image.dims.width;
        if (Math.abs((page.pos.y + page.dims.h) - (newY + image.dims.height)) < snapDist)
            newY = page.pos.y + page.dims.h - image.dims.height;
    }

    // Snap to separator line
    if (doublepage) {
        if (Math.abs(newX - canvas.width / 2) < snapDist) newX = canvas.width / 2;
        if (Math.abs(canvas.width / 2 - (newX + image.dims.width)) < snapDist) newX = canvas.width / 2 - image.dims.width;
    }
    // Snap to other images
    for (let i = 0; i < images.length; i++) {
        if (i === dragging) continue;
        const other = images[i];
        if (Math.abs(newX - (other.pos.x + other.dims.width)) < snapDist) newX = other.pos.x + other.dims.width;
        if (Math.abs(newX + image.dims.width - other.pos.x) < snapDist) newX = other.pos.x - image.dims.width;
        if (Math.abs(newX - other.pos.x) < snapDist) newX = other.pos.x;
        if (Math.abs(newX + image.dims.width - (other.pos.x + other.dims.width)) < snapDist) newX = other.pos.x + other.dims.width - image.dims.width;
        if (Math.abs(newY - (other.pos.y + other.dims.height)) < snapDist) newY = other.pos.y + other.dims.height;
        if (Math.abs(newY + image.dims.height - other.pos.y) < snapDist) newY = other.pos.y - image.dims.height;
        if (Math.abs(newY - other.pos.y) < snapDist) newY = other.pos.y;
        if (Math.abs(newY + image.dims.height - (other.pos.y + other.dims.height)) < snapDist) newY = other.pos.y + other.dims.height - image.dims.height;
    }
    console.log(`Dragging image to: (${newX}, ${newY})`);
    image.setPosition(newX, newY)
    draw();
}

function handleImageResize(mouse, resizing, resizeCorner, draw) {
  const obj = images[resizing];
  let minW = 30, minH = 30, x = obj.pos.x, y = obj.pos.y, w = obj.dims.width, h = obj.dims.height;
  let aspect = w / h;
  // Resize logic for each corner
  if (resizeCorner === 'tl') {
    let newX = mouse.x, newY = mouse.y, newW = (x + w) - newX, newH = (y + h) - newY;
    let propW = newW, propH = propW / aspect;
    if (newH < propH) { propH = newH; propW = propH * aspect; }
    if (propW >= minW && propH >= minH) {
      obj.pos.x = (x + w) - propW; obj.pos.y = (y + h) - propH; obj.dims.width = propW; obj.dims.height = propH;
    }
  } else if (resizeCorner === 'tr') {
    let newY = mouse.y, newW = mouse.x - x, newH = (y + h) - newY;
    let propW = newW, propH = propW / aspect;
    if (newH < propH) { propH = newH; propW = propH * aspect; }
    if (propW >= minW && propH >= minH) {
      obj.pos.y = (y + h) - propH; obj.dims.width = propW; obj.dims.height = propH;
    }
  } else if (resizeCorner === 'bl') {
    let newX = mouse.x, newW = (x + w) - newX, newH = mouse.y - y;
    let propW = newW, propH = propW / aspect;
    if (newH < propH) { propH = newH; propW = propH * aspect; }
    if (propW >= minW && propH >= minH) {
      obj.pos.x = (x + w) - propW; obj.dims.width = propW; obj.dims.height = propH;
    }
  } else if (resizeCorner === 'br') {
    let newW = mouse.x - x, newH = mouse.y - y;
    let propW = newW, propH = propW / aspect;
    if (newH < propH) { propH = newH; propW = propH * aspect; }
    if (propW >= minW && propH >= minH) {
      obj.dims.width = propW; obj.dims.height = propH;
    }
  }
  draw();
}