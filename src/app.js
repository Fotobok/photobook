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
  // Draw all images and text boxes first
  images.forEach((imgObj, idx) => {
    if (imgObj.type === 'text') {
      // Draw background
      ctx.fillStyle = imgObj.bg || 'rgba(255,255,255,0.7)';
      ctx.fillRect(imgObj.x, imgObj.y, imgObj.w, imgObj.h);
      // Draw border
      ctx.strokeStyle = '#007bff';
      ctx.strokeRect(imgObj.x, imgObj.y, imgObj.w, imgObj.h);
      // Draw text
      ctx.fillStyle = imgObj.color || '#222';
      ctx.font = imgObj.font || '16px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.beginPath();
      ctx.rect(imgObj.x, imgObj.y, imgObj.w, imgObj.h);
      ctx.clip();
      ctx.fillText(imgObj.text, imgObj.x + imgObj.w / 2, imgObj.y + imgObj.h / 2);
      ctx.restore();
      // Draw resize handle
      ctx.fillStyle = '#007bff';
      ctx.fillRect(imgObj.x + imgObj.w - 10, imgObj.y + imgObj.h - 10, 10, 10);
    } else {
      ctx.drawImage(imgObj.img, imgObj.x, imgObj.y, imgObj.w, imgObj.h);
      // Draw resize handles at all four corners for selected
      if (selectedImageIdx === idx) {
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
  selectedImageIdx = null;
  dragging = null;
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
      dragging = i;
      offsetX = mouse.x - obj.x;
      offsetY = mouse.y - obj.y;
      selectedImageIdx = i;
      // Bring to front only if not already top
      if (i !== images.length - 1) {
        images.push(images.splice(i, 1)[0]);
        dragging = images.length - 1;
      }
      draw();
      return;
    }
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

// Add text box context menu
let textMenu = document.createElement('div');
textMenu.style.position = 'absolute';
textMenu.style.display = 'none';
textMenu.style.background = '#fff';
textMenu.style.border = '1px solid #ccc';
textMenu.style.padding = '4px 12px';
textMenu.style.cursor = 'pointer';
textMenu.style.zIndex = 1000;
textMenu.textContent = 'Add Text Box';
document.body.appendChild(textMenu);

let contextImageIdx = null;

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const mouse = getMouse(e);
  contextImageIdx = null;
  let onImage = false;
  for (let i = images.length - 1; i >= 0; i--) {
    const img = images[i];
    if (mouse.x > img.x && mouse.x < img.x + img.w && mouse.y > img.y && mouse.y < img.y + img.h) {
      contextImageIdx = i;
      contextMenu.style.left = e.pageX + 'px';
      contextMenu.style.top = e.pageY + 'px';
      contextMenu.style.display = 'block';
      textMenu.style.display = 'none';
      onImage = true;
      return;
    }
  }
  contextMenu.style.display = 'none';
  // If not on image, show text menu
  if (!onImage) {
    textMenu.style.left = e.pageX + 'px';
    textMenu.style.top = e.pageY + 'px';
    textMenu.style.display = 'block';
    textMenu._canvasX = mouse.x;
    textMenu._canvasY = mouse.y;
  }
});

// --- Add crop to context menu for images ---
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

contextMenu.addEventListener('click', () => {
  if (contextImageIdx !== null) {
    images.splice(contextImageIdx, 1);
    draw();
  }
  contextMenu.style.display = 'none';
  contextImageIdx = null;
});

textMenu.addEventListener('click', () => {
  // Add a sample text box object
  images.push({
    type: 'text',
    text: 'Sample Text',
    x: textMenu._canvasX || 60,
    y: textMenu._canvasY || 60,
    w: 120,
    h: 40,
    font: '16px sans-serif',
    color: '#222',
    bg: 'rgba(255,255,255,0.7)'
  });
  draw();
  textMenu.style.display = 'none';
});

document.addEventListener('click', (e) => {
  if (e.target !== contextMenu && e.target !== textMenu) {
    contextMenu.style.display = 'none';
    contextImageIdx = null;
    textMenu.style.display = 'none';
  }
});

// Remove selected image with Delete or Backspace key
let selectedImageIdx = null;
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
