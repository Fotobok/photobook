// Basic logic for uploading, dragging, and resizing images on a canvas
const canvas = document.getElementById('photo-canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('image-upload');

let images = [];
let dragging = null;
let resizing = null;
let offsetX, offsetY;

// --- Add at the top with other state variables ---
let resizeCorner = null;

// --- Crop mode state ---
let cropMode = false;
let cropImageIdx = null;
let cropRect = null;
let cropDrag = null; // {type: 'move'|'edge'|'corner', edge/corner: string}
let cropOffset = {x: 0, y: 0};

upload.addEventListener('change', (e) => {
  Array.from(e.target.files).forEach(file => {
    const img = new window.Image();
    img.onload = () => {
      // --- Resize to fit nicely in canvas ---
      const margin = 40;
      const maxW = canvas.width - margin * 2;
      const maxH = canvas.height - margin * 2;
      let w = img.width;
      let h = img.height;
      const aspect = w / h;
      if (w > maxW) {
        w = maxW;
        h = w / aspect;
      }
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }
      images.push({
        img,
        x: margin + images.length * 30,
        y: margin + images.length * 30,
        w,
        h
      });
      draw();
    };
    img.src = URL.createObjectURL(file);
  });
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  images.forEach((imgObj, idx) => {
    // Remove text box drawing logic
    // Only draw images
    if (!imgObj.type) {
      ctx.drawImage(imgObj.img, imgObj.x, imgObj.y, imgObj.w, imgObj.h);
      // Draw resize handles if not in crop mode
      if (selectedImageIdx === idx && (!cropMode || cropImageIdx !== idx)) {
        const handles = [
          { x: imgObj.x, y: imgObj.y }, // top-left
          { x: imgObj.x + imgObj.w, y: imgObj.y }, // top-right
          { x: imgObj.x, y: imgObj.y + imgObj.h }, // bottom-left
          { x: imgObj.x + imgObj.w, y: imgObj.y + imgObj.h } // bottom-right
        ];
        ctx.fillStyle = '#007bff';
        handles.forEach(h => {
          ctx.beginPath();
          ctx.arc(h.x, h.y, 8, 0, 2 * Math.PI);
          ctx.fill();
        });

        // --- Draw image size in top-left corner of selected image ---
        const pxPerCm = 96 / 2.54;
        const wCm = (imgObj.w / pxPerCm).toFixed(2);
        const hCm = (imgObj.h / pxPerCm).toFixed(2);
        const label = `${Math.round(imgObj.w)}×${Math.round(imgObj.h)} px (${wCm}×${hCm} cm)`;
        ctx.save();
        ctx.font = '13px sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(imgObj.x, imgObj.y, ctx.measureText(label).width + 10, 22);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, imgObj.x + 5, imgObj.y + 4);
        ctx.restore();
      }
      // Draw crop box if in crop mode for this image
      if (cropMode && cropImageIdx === idx && cropRect) {
        ctx.save();
        ctx.strokeStyle = '#ff0000'; // red for crop box
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        ctx.setLineDash([]);
        // Draw crop handles (corners and edges)
        const handles = getCropHandles(cropRect);
        ctx.fillStyle = '#ff0000'; // red for handles
        handles.forEach(h => {
          ctx.beginPath();
          ctx.arc(h.x, h.y, 6, 0, 2 * Math.PI);
          ctx.fill();
        });
        // Draw edge handles (small rectangles)
        getCropEdges(cropRect).forEach(e => {
          ctx.fillRect(e.x - 4, e.y - 8, 8, 16);
        });
        ctx.restore();
      }
    }
  });
  // Draw cm scales on x and y axes LAST so they are on top
  drawCmScales();
}

function drawCmScales() {
  const pxPerCm = 96 / 2.54;
  ctx.save();
  ctx.strokeStyle = '#888';
  ctx.fillStyle = '#444';
  ctx.font = '10px sans-serif';
  ctx.lineWidth = 1;
  // X axis (top)
  for (let x = 0; x <= canvas.width; x += pxPerCm) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 8);
    ctx.stroke();
    if (x > 0) {
      ctx.fillText(Math.round(x / pxPerCm), x + 2, 16);
    }
  }
  // Y axis (left)
  for (let y = 0; y <= canvas.height; y += pxPerCm) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(8, y);
    ctx.stroke();
    if (y > 0) {
      ctx.save();
      ctx.translate(16, y + 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(Math.round(y / pxPerCm), 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

// --- Canvas resize UI ---
// Create input fields for width/height in cm and a button
const controls = document.createElement('div');
controls.style.margin = '12px 0';
controls.innerHTML = `
  <label style="margin-right:8px;">Width (cm): <input id="canvas-width-cm" type="number" min="1" step="0.1" style="width:60px;"></label>
  <label style="margin-right:8px;">Height (cm): <input id="canvas-height-cm" type="number" min="1" step="0.1" style="width:60px;"></label>
  <button id="set-canvas-cm">Set Size</button>
`;
// Place controls in the dedicated controls div above the canvas
const controlsContainer = document.getElementById('canvas-controls');
if (controlsContainer) {
  controlsContainer.appendChild(controls);
} else {
  canvas.parentNode.insertBefore(controls, canvas);
}

document.getElementById('set-canvas-cm').onclick = function() {
  const w = parseFloat(document.getElementById('canvas-width-cm').value);
  const h = parseFloat(document.getElementById('canvas-height-cm').value);
  if (w > 0 && h > 0) setCanvasSizeCm(w, h);
};

// Set default values (A4)
document.getElementById('canvas-width-cm').value = 15;
document.getElementById('canvas-height-cm').value = 21;
setCanvasSizeCm(15, 21);

// --- Canvas edge drag resize ---
let resizingCanvas = false;
let resizeStart = null;
let origWidth = null;
let origHeight = null;

canvas.addEventListener('mousedown', (e) => {
  // Canvas edge detection (10px at bottom-right corner)
  const rect = canvas.getBoundingClientRect();
  const mouse = getMouse(e);
  if (
    e.offsetX > canvas.width - 15 &&
    e.offsetY > canvas.height - 15
  ) {
    resizingCanvas = true;
    resizeStart = { x: e.clientX, y: e.clientY };
    origWidth = canvas.width;
    origHeight = canvas.height;
    document.body.style.cursor = 'nwse-resize';
    return;
  }
  // --- Prevent image selection/drag when cropping ---
  if (cropMode) return;
  // Remove: selectedImageIdx = null; (so selection persists unless clicking empty space)
  dragging = null;
  let found = false;
  // --- Shift+resize for cropping --- (remove cropping logic)
  for (let i = images.length - 1; i >= 0; i--) {
    const obj = images[i];
    // Check all four resize handles for this object (not just selected)
    const handles = [
      { x: obj.x, y: obj.y, corner: 'tl' },
      { x: obj.x + obj.w, y: obj.y, corner: 'tr' },
      { x: obj.x, y: obj.y + obj.h, corner: 'bl' },
      { x: obj.x + obj.w, y: obj.y + obj.h, corner: 'br' }
    ];
    for (let h = 0; h < handles.length; h++) {
      const hx = handles[h].x;
      const hy = handles[h].y;
      if (Math.hypot(mouse.x - hx, mouse.y - hy) <= 10) {
        selectedImageIdx = i;
        resizing = i;
        resizeCorner = handles[h].corner;
        offsetX = mouse.x - obj.x;
        offsetY = mouse.y - obj.y;
        draw();
        return;
      }
    }
    // Check drag
    if (mouse.x > obj.x && mouse.x < obj.x + obj.w && mouse.y > obj.y && mouse.y < obj.y + obj.h) {
      // Select image on single click
      selectedImageIdx = i;
      found = true;
      // Only start dragging if mouse is moved (handled in mousemove)
      // Bring to front only if not already top
      if (i !== images.length - 1) {
        images.push(images.splice(i, 1)[0]);
        selectedImageIdx = images.length - 1;
      }
      draw();
      // Only set dragging if mouse is moved (see mousemove)
      // But for now, set dragging here for legacy behavior:
      dragging = images.length - 1;
      offsetX = mouse.x - images[dragging].x;
      offsetY = mouse.y - images[dragging].y;
      return;
    }
  }
  // If click not on any image, clear selection
  if (!found) {
    selectedImageIdx = null;
    draw();
  }
});

document.addEventListener('mousemove', (e) => {
  const mouse = getMouse(e);
  if (resizingCanvas) {
    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;
    // Convert px to cm
    const pxPerCm = 96 / 2.54;
    const newWcm = Math.max(1, (origWidth + dx) / pxPerCm);
    const newHcm = Math.max(1, (origHeight + dy) / pxPerCm);
    setCanvasSizeCm(newWcm, newHcm);
    document.getElementById('canvas-width-cm').value = newWcm.toFixed(1);
    document.getElementById('canvas-height-cm').value = newHcm.toFixed(1);
  } else if (dragging !== null) {
    const obj = images[dragging];
    // Clamp image position so it stays within canvas
    let newX = mouse.x - offsetX;
    let newY = mouse.y - offsetY;
    // --- Snapping logic ---
    const snapDist = 10; // px
    // Snap to canvas edges
    if (Math.abs(newX) < snapDist) newX = 0;
    if (Math.abs(newY) < snapDist) newY = 0;
    if (Math.abs((canvas.width - (newX + obj.w))) < snapDist) newX = canvas.width - obj.w;
    if (Math.abs((canvas.height - (newY + obj.h))) < snapDist) newY = canvas.height - obj.h;
    // Snap to other images' edges
    for (let i = 0; i < images.length; i++) {
      if (i === dragging) continue;
      const other = images[i];
      // Snap left edge
      if (Math.abs(newX - (other.x + other.w)) < snapDist) newX = other.x + other.w;
      if (Math.abs(newX + obj.w - other.x) < snapDist) newX = other.x - obj.w;
      // Snap right edge
      if (Math.abs(newX - other.x) < snapDist) newX = other.x;
      if (Math.abs(newX + obj.w - (other.x + other.w)) < snapDist) newX = other.x + other.w - obj.w;
      // Snap top edge
      if (Math.abs(newY - (other.y + other.h)) < snapDist) newY = other.y + other.h;
      if (Math.abs(newY + obj.h - other.y) < snapDist) newY = other.y - obj.h;
      // Snap bottom edge
      if (Math.abs(newY - other.y) < snapDist) newY = other.y;
      if (Math.abs(newY + obj.h - (other.y + other.h)) < snapDist) newY = other.y + other.h - obj.h;
    }
    // Clamp to canvas after snapping
    newX = Math.max(0, Math.min(newX, canvas.width - obj.w));
    newY = Math.max(0, Math.min(newY, canvas.height - obj.h));
    obj.x = newX;
    obj.y = newY;
    draw();
  } else if (resizing !== null) {
    const obj = images[resizing];
    let minW = obj.type === 'text' ? 40 : 30;
    let minH = obj.type === 'text' ? 20 : 30;
    let x = obj.x, y = obj.y, w = obj.w, h = obj.h;
    // Four-corner resize logic (using mouse position relative to corner)
    if (resizeCorner === 'tl') {
      let newX = mouse.x;
      let newY = mouse.y;
      let newW = (x + w) - newX;
      let newH = (y + h) - newY;
      if (obj.type === 'text') {
        if (newW >= minW) { obj.x = newX; obj.w = newW; }
        if (newH >= minH) { obj.y = newY; obj.h = newH; }
      } else {
        let aspect = w / h;
        let propW = newW;
        let propH = propW / aspect;
        if (newH < propH) { propH = newH; propW = propH * aspect; }
        if (propW >= minW && propH >= minH) {
          obj.x = (x + w) - propW;
          obj.y = (y + h) - propH;
          obj.w = propW;
          obj.h = propH;
        }
      }
    } else if (resizeCorner === 'tr') {
      let newX = x;
      let newY = mouse.y;
      let newW = mouse.x - x;
      let newH = (y + h) - newY;
      if (obj.type === 'text') {
        if (newW >= minW) { obj.w = newW; }
        if (newH >= minH) { obj.y = newY; obj.h = newH; }
      } else {
        let aspect = w / h;
        let propW = newW;
        let propH = propW / aspect;
        if (newH < propH) { propH = newH; propW = propH * aspect; }
        if (propW >= minW && propH >= minH) {
          obj.y = (y + h) - propH;
          obj.w = propW;
          obj.h = propH;
        }
      }
    } else if (resizeCorner === 'bl') {
      let newX = mouse.x;
      let newY = y;
      let newW = (x + w) - newX;
      let newH = mouse.y - y;
      if (obj.type === 'text') {
        if (newW >= minW) { obj.x = newX; obj.w = newW; }
        if (newH >= minH) { obj.h = newH; }
      } else {
        let aspect = w / h;
        let propW = newW;
        let propH = propW / aspect;
        if (newH < propH) { propH = newH; propW = propH * aspect; }
        if (propW >= minW && propH >= minH) {
          obj.x = (x + w) - propW;
          obj.w = propW;
          obj.h = propH;
        }
      }
    } else if (resizeCorner === 'br') {
      let newX = x;
      let newY = y;
      let newW = mouse.x - x;
      let newH = mouse.y - y;
      if (obj.type === 'text') {
        if (newW >= minW) { obj.w = newW; }
        if (newH >= minH) { obj.h = newH; }
      } else {
        let aspect = w / h;
        let propW = newW;
        let propH = propW / aspect;
        if (newH < propH) { propH = newH; propW = propH * aspect; }
        if (propW >= minW && propH >= minH) {
          obj.w = propW;
          obj.h = propH;
        }
      }
    }
    draw();
  }
});

document.addEventListener('mouseup', (e) => {
  if (resizingCanvas) {
    resizingCanvas = false;
    document.body.style.cursor = '';
  } else {
    dragging = null;
    resizing = null;
    resizeCorner = null;
  }
});

canvas.addEventListener('mouseleave', () => {
  dragging = null;
  resizing = null;
});

// Enable drag-and-drop image upload on the canvas
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
  canvas.style.border = '2px dashed #007bff';
});

canvas.addEventListener('dragleave', (e) => {
  e.preventDefault();
  canvas.style.border = '';
});

canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  canvas.style.border = '';
  const files = Array.from(e.dataTransfer.files);
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const img = new window.Image();
    img.onload = () => {
      // --- Resize to fit nicely in canvas ---
      const margin = 40;
      const maxW = canvas.width - margin * 2;
      const maxH = canvas.height - margin * 2;
      let w = img.width;
      let h = img.height;
      const aspect = w / h;
      if (w > maxW) {
        w = maxW;
        h = w / aspect;
      }
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }
      images.push({
        img,
        x: margin + images.length * 30,
        y: margin + images.length * 30,
        w,
        h
      });
      draw();
    };
    img.src = URL.createObjectURL(file);
  });
});

// Remove image on right-click (contextmenu) with a custom menu
let contextMenu = document.createElement('div');
contextMenu.style.position = 'absolute';
contextMenu.style.display = 'none';
contextMenu.style.background = '#fff';
contextMenu.style.border = '1px solid #ccc';
contextMenu.style.padding = '4px 12px';
contextMenu.style.cursor = 'pointer';
contextMenu.style.zIndex = 1000;
contextMenu.textContent = 'Delete';
document.body.appendChild(contextMenu);

// --- Crop to context menu for images ---
contextMenu.innerHTML = '';
const deleteOption = document.createElement('div');
deleteOption.textContent = 'Delete';
deleteOption.style.cursor = 'pointer';
deleteOption.onclick = function() {
  if (contextImageIdx !== null) {
    images.splice(contextImageIdx, 1);
    draw();
  }
  contextMenu.style.display = 'none';
  contextImageIdx = null;
};
contextMenu.appendChild(deleteOption);

let contextImageIdx = null;

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const mouse = getMouse(e);
  contextImageIdx = null;
  for (let i = images.length - 1; i >= 0; i--) {
    const img = images[i];
    if (mouse.x > img.x && mouse.x < img.x + img.w && mouse.y > img.y && mouse.y < img.y + img.h) {
      contextImageIdx = i;
      contextMenu.style.left = e.pageX + 'px';
      contextMenu.style.top = e.pageY + 'px';
      contextMenu.style.display = 'block';
      return;
    }
  }
  contextMenu.style.display = 'none';
});

document.addEventListener('click', (e) => {
  if (e.target !== contextMenu) {
    contextMenu.style.display = 'none';
    contextImageIdx = null;
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImageIdx !== null) {
    images.splice(selectedImageIdx, 1);
    selectedImageIdx = null;
    draw();
  }
});

function getMouse(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

// Utility: set canvas size in centimeters
function setCanvasSizeCm(widthCm, heightCm) {
  // 1 inch = 2.54 cm, 1 inch = 96 px (CSS standard)
  const pxPerCm = 96 / 2.54;
  canvas.width = Math.round(widthCm * pxPerCm);
  canvas.height = Math.round(heightCm * pxPerCm);
  canvas.style.width = widthCm + 'cm';
  canvas.style.height = heightCm + 'cm';
  draw();
}
// Example usage: setCanvasSizeCm(21, 29.7); // A4 size

// --- Crop handles helpers ---
function getCropHandles(rect) {
  // 4 corners
  return [
    { x: rect.x, y: rect.y, corner: 'tl' },
    { x: rect.x + rect.w, y: rect.y, corner: 'tr' },
    { x: rect.x, y: rect.y + rect.h, corner: 'bl' },
    { x: rect.x + rect.w, y: rect.y + rect.h, corner: 'br' }
  ];
}
function getCropEdges(rect) {
  // 4 edges (center of each edge)
  return [
    { x: rect.x + rect.w / 2, y: rect.y, edge: 'top' },
    { x: rect.x + rect.w / 2, y: rect.y + rect.h, edge: 'bottom' },
    { x: rect.x, y: rect.y + rect.h / 2, edge: 'left' },
    { x: rect.x + rect.w, y: rect.y + rect.h / 2, edge: 'right' }
  ];
}

// --- Double click to enter/exit crop mode ---
canvas.addEventListener('dblclick', (e) => {
  const mouse = getMouse(e);
  if (!cropMode) {
    // Enter crop mode if double clicked on image
    for (let i = images.length - 1; i >= 0; i--) {
      const obj = images[i];
      if (!obj.type && mouse.x > obj.x && mouse.x < obj.x + obj.w && mouse.y > obj.y && mouse.y < obj.y + obj.h) {
        cropMode = true;
        cropImageIdx = i;
        // Default crop rect: full image
        cropRect = {
          x: obj.x + obj.w * 0.1,
          y: obj.y + obj.h * 0.1,
          w: obj.w * 0.8,
          h: obj.h * 0.8
        };
        cropDrag = null;
        draw();
        return;
      }
    }
  } else if (cropMode && cropImageIdx !== null) {
    // Apply crop
    const obj = images[cropImageIdx];
    // Calculate crop in image coordinates
    const cropX = (cropRect.x - obj.x) * (obj.img.width / obj.w);
    const cropY = (cropRect.y - obj.y) * (obj.img.height / obj.h);
    const cropW = cropRect.w * (obj.img.width / obj.w);
    const cropH = cropRect.h * (obj.img.height / obj.h);
    // Create cropped image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.max(1, Math.round(cropW));
    tempCanvas.height = Math.max(1, Math.round(cropH));
    const tctx = tempCanvas.getContext('2d');
    tctx.drawImage(obj.img, cropX, cropY, cropW, cropH, 0, 0, tempCanvas.width, tempCanvas.height);
    const croppedImg = new window.Image();
    croppedImg.onload = () => {
      // Replace image object with cropped version, keep position and size of crop rect
      obj.img = croppedImg;
      obj.x = cropRect.x;
      obj.y = cropRect.y;
      obj.w = cropRect.w;
      obj.h = cropRect.h;
      cropMode = false;
      cropImageIdx = null;
      cropRect = null;
      cropDrag = null;
      draw();
    };
    croppedImg.src = tempCanvas.toDataURL();
  }
});

// --- Crop box drag/resize logic ---
canvas.addEventListener('mousedown', (e) => {
  // ...existing code...
  if (cropMode && cropImageIdx !== null && cropRect) {
    const mouse = getMouse(e);
    // Check corners first
    const handles = getCropHandles(cropRect);
    for (let h of handles) {
      if (Math.hypot(mouse.x - h.x, mouse.y - h.y) <= 10) {
        cropDrag = { type: 'corner', corner: h.corner };
        cropOffset.x = mouse.x - h.x;
        cropOffset.y = mouse.y - h.y;
        return;
      }
    }
    // Check edges
    const edges = getCropEdges(cropRect);
    for (let ed of edges) {
      if (ed.edge === 'top' || ed.edge === 'bottom') {
        if (Math.abs(mouse.x - ed.x) < cropRect.w / 2 && Math.abs(mouse.y - ed.y) < 12) {
          cropDrag = { type: 'edge', edge: ed.edge };
          cropOffset.y = mouse.y - ed.y;
          return;
        }
      } else {
        if (Math.abs(mouse.y - ed.y) < cropRect.h / 2 && Math.abs(mouse.x - ed.x) < 12) {
          cropDrag = { type: 'edge', edge: ed.edge };
          cropOffset.x = mouse.x - ed.x;
          return;
        }
      }
    }
    // Check inside crop rect for move
    if (
      mouse.x > cropRect.x && mouse.x < cropRect.x + cropRect.w &&
      mouse.y > cropRect.y && mouse.y < cropRect.y + cropRect.h
    ) {
      cropDrag = { type: 'move' };
      cropOffset.x = mouse.x - cropRect.x;
      cropOffset.y = mouse.y - cropRect.y;
      return;
    }
    // If click outside crop rect, exit crop mode
    cropMode = false;
    cropImageIdx = null;
    cropRect = null;
    cropDrag = null;
    draw();
    return;
  }
  // ...existing code...
});

document.addEventListener('mousemove', (e) => {
  // ...existing code...
  if (cropMode && cropImageIdx !== null && cropRect && cropDrag) {
    const mouse = getMouse(e);
    let r = { ...cropRect };
    const minW = 30, minH = 30;
    if (cropDrag.type === 'move') {
      // Move crop rect, clamp to image bounds
      const obj = images[cropImageIdx];
      let nx = mouse.x - cropOffset.x;
      let ny = mouse.y - cropOffset.y;
      nx = Math.max(obj.x, Math.min(nx, obj.x + obj.w - r.w));
      ny = Math.max(obj.y, Math.min(ny, obj.y + obj.h - r.h));
      cropRect.x = nx;
      cropRect.y = ny;
    } else if (cropDrag.type === 'corner') {
      // Resize from corner, clamp to image bounds and min size
      const obj = images[cropImageIdx];
      let mx = mouse.x - cropOffset.x;
      let my = mouse.y - cropOffset.y;
      if (cropDrag.corner === 'tl') {
        let nx = Math.min(mx, r.x + r.w - minW);
        let ny = Math.min(my, r.y + r.h - minH);
        let nw = (r.x + r.w) - nx;
        let nh = (r.y + r.h) - ny;
        if (nx < obj.x) { nx = obj.x; nw = (r.x + r.w) - nx; }
        if (ny < obj.y) { ny = obj.y; nh = (r.y + r.h) - ny; }
        if (nw >= minW && nh >= minH) {
          cropRect.x = nx; cropRect.y = ny; cropRect.w = nw; cropRect.h = nh;
        }
      } else if (cropDrag.corner === 'tr') {
        let nx = r.x;
        let ny = Math.min(my, r.y + r.h - minH);
        let nw = Math.max(minW, mx - r.x);
        let nh = (r.y + r.h) - ny;
        if (mx > obj.x + obj.w) { nw = obj.x + obj.w - r.x; }
        if (ny < obj.y) { ny = obj.y; nh = (r.y + r.h) - ny; }
        if (nw >= minW && nh >= minH) {
          cropRect.y = ny; cropRect.w = nw; cropRect.h = nh;
        }
      } else if (cropDrag.corner === 'bl') {
        let nx = Math.min(mx, r.x + r.w - minW);
        let ny = r.y;
        let nw = (r.x + r.w) - nx;
        let nh = Math.max(minH, mouse.y - r.y - cropOffset.y);
        if (nx < obj.x) { nx = obj.x; nw = (r.x + r.w) - nx; }
        if (mouse.y > obj.y + obj.h) { nh = obj.y + obj.h - r.y; }
        if (nw >= minW && nh >= minH) {
          cropRect.x = nx; cropRect.w = nw; cropRect.h = nh;
        }
      } else if (cropDrag.corner === 'br') {
        let nx = r.x;
        let ny = r.y;
        let nw = Math.max(minW, mouse.x - r.x - cropOffset.x);
        let nh = Math.max(minH, mouse.y - r.y - cropOffset.y);
        if (mouse.x > obj.x + obj.w) { nw = obj.x + obj.w - r.x; }
        if (mouse.y > obj.y + obj.h) { nh = obj.y + obj.h - r.y; }
        if (nw >= minW && nh >= minH) {
          cropRect.w = nw; cropRect.h = nh;
        }
      }
    } else if (cropDrag.type === 'edge') {
      // Resize from edge, clamp to image bounds and min size
      const obj = images[cropImageIdx];
      if (cropDrag.edge === 'top') {
        let ny = Math.min(mouse.y - cropOffset.y, r.y + r.h - minH);
        if (ny < obj.x) ny = obj.y;
        let nh = (r.y + r.h) - ny;
        if (nh >= minH) {
          cropRect.y = ny; cropRect.h = nh;
        }
      } else if (cropDrag.edge === 'bottom') {
        let nh = Math.max(minH, mouse.y - r.y - cropOffset.y);
        if (mouse.y > obj.y + obj.h) nh = obj.y + obj.h - r.y;
        if (nh >= minH) {
          cropRect.h = nh;
        }
      } else if (cropDrag.edge === 'left') {
        let nx = Math.min(mouse.x - cropOffset.x, r.x + r.w - minW);
        if (nx < obj.x) nx = obj.x;
        let nw = (r.x + r.w) - nx;
        if (nw >= minW) {
          cropRect.x = nx; cropRect.w = nw;
        }
      } else if (cropDrag.edge === 'right') {
        let nw = Math.max(minW, mouse.x - r.x - cropOffset.x);
        if (mouse.x > obj.x + obj.w) nw = obj.x + obj.w - r.x;
        if (nw >= minW) {
          cropRect.w = nw;
        }
      }
    }
    draw();
    return;
  }
  // ...existing code...
});

document.addEventListener('mouseup', (e) => {
  // ...existing code...
  if (cropMode) {
    cropDrag = null;
  }
});
