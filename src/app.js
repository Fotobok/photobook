// Photobook: Upload, arrange, resize, crop images on a canvas

const canvas = document.getElementById('photo-canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('image-upload');

let dragging = null, resizing = null, resizeCorner = null;
let offsetX, offsetY;

// Single/double page state
let doublepage = false;

// --- Image Upload ---
upload.addEventListener('change', (e) => {
  Array.from(e.target.files).forEach(file => loadImageFile(file, canvas, doublepage, draw));
});

// --- Double Page Toggle ---
const doublepage_checkbutton = document.getElementById('doublepage_checkbutton');
if (doublepage_checkbutton) {
  doublepage_checkbutton.checked = false;
  doublepage_checkbutton.addEventListener('change', (e) => {
    doublepage = e.target.checked;
    doublepage
      ? setCanvasSize(2 * canvas.width, canvas.height)
      : setCanvasSize(0.5 * canvas.width, canvas.height);
  });
}

// --- Canvas Controls (resize in cm) ---
setupCanvasControls(canvas, setCanvasSizeCm, draw);

// --- Canvas Edge Drag Resize ---
let resizingCanvas = false, resizeStart = null, origWidth = null, origHeight = null;

// --- Mouse Events ---
canvas.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', () => { dragging = null; resizing = null; });

// --- Drag-and-Drop Upload ---
canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.style.border = '2px dashed #007bff'; });
canvas.addEventListener('dragleave', (e) => { e.preventDefault(); canvas.style.border = ''; });
canvas.addEventListener('drop', handleDrop);

// --- Context Menu for Delete ---
setupContextMenu(canvas, images, draw);

// --- Keyboard Delete ---
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImageIdx.value !== null) {
    images.splice(selectedImageIdx.value, 1);
    setSelectedImageIdx(null);
    draw();
  }
});

// --- Double Click Crop Mode ---
canvas.addEventListener('dblclick', (e) => handleDoubleClick(e, canvas, images, draw));

// --- Mouse Event Handlers ---
function handleMouseDown(e) {
  const mouse = getMouse(e);
  // Canvas edge resize
  if (e.offsetX > canvas.width - 15 && e.offsetY > canvas.height - 15) {
    resizingCanvas = true;
    resizeStart = { x: e.clientX, y: e.clientY };
    origWidth = canvas.width;
    origHeight = canvas.height;
    document.body.style.cursor = 'nwse-resize';
    return;
  }
  // Crop mode: handle crop rect drag/resize
  if (cropMode && cropImageIdx !== null && cropRect) {
    if (handleCropMouseDown(mouse)) return;
    // Click outside crop rect: exit crop mode
    cropMode = false; cropImageIdx = null; cropRect = null; cropDrag = null; draw();
    return;
  }
  // Image resize/drag
  dragging = null;
  let found = false;
  for (let i = images.length - 1; i >= 0; i--) {
    const obj = images[i];
    // Resize handles
    for (let h of getResizeHandles(obj)) {
      if (Math.hypot(mouse.x - h.x, mouse.y - h.y) <= 10) {
        selectedImageIdx.value = i; // <-- fix: set .value, not the variable itself
        resizing = i;
        resizeCorner = h.corner;
        offsetX = mouse.x - obj.x;
        offsetY = mouse.y - obj.y;
        draw(images, selectedImageIdx.value, cropMode, cropImageIdx, cropRect, doublepage); // always pass current state
        return;
      }
    }
    // Drag image
    if (mouse.x > obj.x && mouse.x < obj.x + obj.w && mouse.y > obj.y && mouse.y < obj.y + obj.h) {
      selectedImageIdx.value = i; // <-- fix: set .value, not the variable itself
      found = true;
      if (i !== images.length - 1) {
        images.push(images.splice(i, 1)[0]);
        selectedImageIdx.value = images.length - 1;
      }
      draw(images, selectedImageIdx.value, cropMode, cropImageIdx, cropRect, doublepage);
      dragging = images.length - 1;
      offsetX = mouse.x - images[dragging].x;
      offsetY = mouse.y - images[dragging].y;
      return;
    }
  }
  if (!found) { selectedImageIdx.value = null; draw(images, selectedImageIdx.value, cropMode, cropImageIdx, cropRect, doublepage); }
}
function handleMouseMove(e) {
  const mouse = getMouse(e);
  if (resizingCanvas) {
    // Canvas edge resize
    const dx = e.clientX - resizeStart.x, dy = e.clientY - resizeStart.y;
    const pxPerCm = 96 / 2.54;
    const newWcm = Math.max(1, (origWidth + dx) / pxPerCm);
    const newHcm = Math.max(1, (origHeight + dy) / pxPerCm);
    setCanvasSizeCm(newWcm, newHcm);
    document.getElementById('canvas-width-cm').value = newWcm.toFixed(1);
    document.getElementById('canvas-height-cm').value = newHcm.toFixed(1);
  } else if (dragging !== null) {
    // Drag image with snapping
    handleImageDrag(mouse, dragging, offsetX, offsetY, canvas, doublepage, draw);
  } else if (resizing !== null) {
    // Resize image
    handleImageResize(mouse, resizing, resizeCorner, canvas, draw);
  }
  // Crop drag logic
  if (cropMode && cropImageIdx !== null && cropRect && cropDrag) {
    handleCropDrag(mouse);
    draw();
    return;
  }
}
function handleMouseUp() {
  if (resizingCanvas) {
    resizingCanvas = false;
    document.body.style.cursor = '';
  } else {
    dragging = null;
    resizing = null;
    resizeCorner = null;
  }
  if (cropMode) cropDrag = null;
}
function handleDrop(e) {
  e.preventDefault();
  canvas.style.border = '';
  Array.from(e.dataTransfer.files).forEach(file => loadImageFile(file, canvas, doublepage, draw));
}