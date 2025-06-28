// imageLogic.js

// Ensure images is defined globally before any code uses it
if (typeof images === "undefined") var images = [];
if (typeof selectedImageIdx === "undefined") var selectedImageIdx = { value: null };

function setSelectedImageIdx(idx) {
  selectedImageIdx.value = idx;
}

function loadImageFile(file, canvas, doublepage, draw) {
  if (!file.type.startsWith('image/')) return;
  const img = new window.Image();
  img.onload = () => {
    const margin = 40;
    let maxW = doublepage ? canvas.width / 2 - margin * 2 : canvas.width - margin * 2;
    const maxH = canvas.height - margin * 2;
    let w = img.width, h = img.height, aspect = w / h;
    if (w > maxW) { w = maxW; h = w / aspect; }
    if (h > maxH) { h = maxH; w = h * aspect; }
    images.push({ img, x: margin + images.length * 30, y: margin + images.length * 30, w, h });
    draw();
  };
  img.src = URL.createObjectURL(file);
}

function handleImageDrag(mouse, dragging, offsetX, offsetY, canvas, doublepage, draw) {
  const obj = images[dragging];
  let newX = mouse.x - offsetX, newY = mouse.y - offsetY, snapDist = 10;
  // Snap to canvas edges
  if (Math.abs(newX) < snapDist) newX = 0;
  if (Math.abs(newY) < snapDist) newY = 0;
  if (Math.abs((canvas.width - (newX + obj.w))) < snapDist) newX = canvas.width - obj.w;
  if (Math.abs((canvas.height - (newY + obj.h))) < snapDist) newY = canvas.height - obj.h;
  // Snap to separator line
  if (doublepage) {
    if (Math.abs(newX - canvas.width / 2) < snapDist) newX = canvas.width / 2;
    if (Math.abs(canvas.width / 2 - (newX + obj.w)) < snapDist) newX = canvas.width / 2 - obj.w;
  }
  // Snap to other images
  for (let i = 0; i < images.length; i++) {
    if (i === dragging) continue;
    const other = images[i];
    if (Math.abs(newX - (other.x + other.w)) < snapDist) newX = other.x + other.w;
    if (Math.abs(newX + obj.w - other.x) < snapDist) newX = other.x - obj.w;
    if (Math.abs(newX - other.x) < snapDist) newX = other.x;
    if (Math.abs(newX + obj.w - (other.x + other.w)) < snapDist) newX = other.x + other.w - obj.w;
    if (Math.abs(newY - (other.y + other.h)) < snapDist) newY = other.y + other.h;
    if (Math.abs(newY + obj.h - other.y) < snapDist) newY = other.y - obj.h;
    if (Math.abs(newY - other.y) < snapDist) newY = other.y;
    if (Math.abs(newY + obj.h - (other.y + other.h)) < snapDist) newY = other.y + other.h - obj.h;
  }
  // Clamp to canvas
  newX = Math.max(0, Math.min(newX, canvas.width - obj.w));
  newY = Math.max(0, Math.min(newY, canvas.height - obj.h));
  obj.x = newX; obj.y = newY;
  draw();
}

function handleImageResize(mouse, resizing, resizeCorner, canvas, draw) {
  const obj = images[resizing];
  let minW = 30, minH = 30, x = obj.x, y = obj.y, w = obj.w, h = obj.h;
  let aspect = w / h;
  // Resize logic for each corner
  if (resizeCorner === 'tl') {
    let newX = mouse.x, newY = mouse.y, newW = (x + w) - newX, newH = (y + h) - newY;
    let propW = newW, propH = propW / aspect;
    if (newH < propH) { propH = newH; propW = propH * aspect; }
    if (propW >= minW && propH >= minH) {
      obj.x = (x + w) - propW; obj.y = (y + h) - propH; obj.w = propW; obj.h = propH;
    }
  } else if (resizeCorner === 'tr') {
    let newY = mouse.y, newW = mouse.x - x, newH = (y + h) - newY;
    let propW = newW, propH = propW / aspect;
    if (newH < propH) { propH = newH; propW = propH * aspect; }
    if (propW >= minW && propH >= minH) {
      obj.y = (y + h) - propH; obj.w = propW; obj.h = propH;
    }
  } else if (resizeCorner === 'bl') {
    let newX = mouse.x, newW = (x + w) - newX, newH = mouse.y - y;
    let propW = newW, propH = propW / aspect;
    if (newH < propH) { propH = newH; propW = propH * aspect; }
    if (propW >= minW && propH >= minH) {
      obj.x = (x + w) - propW; obj.w = propW; obj.h = propH;
    }
  } else if (resizeCorner === 'br') {
    let newW = mouse.x - x, newH = mouse.y - y;
    let propW = newW, propH = propW / aspect;
    if (newH < propH) { propH = newH; propW = propH * aspect; }
    if (propW >= minW && propH >= minH) {
      obj.w = propW; obj.h = propH;
    }
  }
  draw();
}