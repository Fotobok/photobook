// Photobook: Upload, arrange, resize, crop images on a canvas

const canvas = document.getElementById('photo-canvas');
const container = document.getElementById('canvas-container');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('image-upload');

// Currently dragged image index, resizing image index, and which corner is being resized
let dragging = null, resizing = null, resizeCorner = null;

// Mouse offset from image's top-left corner during drag/resize
let offsetX, offsetY;

let imagePosOriginal = {x: 0, y: 0};
let imageScaleOriginal = {w: 0, h: 0};

// Single/double page state
let doublepage = false;

// --- Zoom and Pan State ---
let zoom = 1;
let panX = 0, panY = 0;
let panning = false;
let panStart = { x: 0, y: 0 };
let panOrigin = { x: 0, y: 0 };

defaultWidthCm = 15
defaultHeightCm = 21
canvas_width_entry = document.getElementById('canvas-width-cm');
canvas_height_entry = document.getElementById('canvas-height-cm');
canvas_width_entry.value = defaultWidthCm
canvas_height_entry.value = defaultHeightCm

scroll_sensitivity = 0.25

console.log(cmToPx(defaultWidthCm))
console.log(cmToPx(defaultHeightCm))
console.log(canvas.width)
console.log(canvas.height)

const doublepage_checkbutton = document.getElementById('doublepage_checkbutton');

// Add Page/Remove Page buttons
const addPageBtn = document.getElementById('add-page-btn');
const removePageBtn = document.getElementById('remove-page-btn');

fotopages_margin = 50

fotopages = []
fotopages.push(new FotoPage(0, 0, cmToPx(defaultWidthCm), cmToPx(defaultHeightCm)));
handleDoublePage();

doublepage_checkbutton.addEventListener('change', (e) => {handleDoublePage(e)});

canvas_width_entry.addEventListener('change', (e) => {
  handleCanvasWidthChanged(e)
  console.log('Canvas width changed:', canvas_width_entry.value);
});

canvas_height_entry.addEventListener('change', (e) => {
  handleCanvasHeightChanged(e)
});

// --- Image Upload ---
upload.addEventListener('change', (e) => {
  Array.from(e.target.files).forEach(file => loadImageFile(file, doublepage, draw));
});

// Add Page/Remove Page button event listeners
addPageBtn.addEventListener('click', () => {
  handleAddPage();
});

removePageBtn.addEventListener('click', () => {
  handleRemovePage();
});

// --- Mouse Events ---
canvas.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', () => { dragging = null; resizing = null; });

window.addEventListener('resize', (e) => handleWindowResize(e, canvas));
window.dispatchEvent(new Event('resize'));

fotopages[0].center(doublepage)
draw()

// --- Drag-and-Drop Upload ---
canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.style.border = '2px dashed #007bff'; });
canvas.addEventListener('dragleave', (e) => { e.preventDefault(); canvas.style.border = ''; });
canvas.addEventListener('drop', handleDrop);

// --- Context Menu for Delete ---
setupContextMenu(canvas, images, draw);

// --- Keyboard Delete ---
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImageIdx !== null) {
    images.splice(selectedImageIdx, 1);
    selectedImageIdx = null;
    draw();
  }
});

const exportBtn = document.getElementById('export-btn');
exportBtn.addEventListener('click', () => {exportFotobok();});

const exportCompactBtn = document.getElementById('export-compact-btn');
exportCompactBtn.addEventListener('click', () => {exportAllImagesCompact();});



// --- Double Click Crop Mode ---
canvas.addEventListener('dblclick', (e) => handleDoubleClick(e));

// --- Mouse Wheel for Zoom ---
canvas.addEventListener('wheel', (e) => handleScrolling(e), { passive: false });


function cmToPx(cm, dpi = 96) {
  return Math.round((cm / 2.54) * dpi);
}

// --- Mouse Event Handlers ---
function handleMouseDown(e) {
  const mouse = getMouse(e);

  // canvas pan and zoom
  if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
    panning = true;
    panStart = getMouse(e, false); // screen coords
    panOrigin = { x: panX, y: panY };
    canvas.style.cursor = 'grab';
    e.preventDefault();
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
        selectedImageIdx = i;
        resizing = i;
        imageScaleOriginal = {w: obj.dims.width, h: obj.dims.height};
        console.log('imageScaleOriginal:', imageScaleOriginal);
        resizeCorner = h.corner;
        offsetX = mouse.x - obj.pos.x;
        offsetY = mouse.y - obj.pos.y;
        draw(images, selectedImageIdx, cropMode, cropImageIdx, cropRect, doublepage); 
        return;
      }
    }
    // Drag image
    if (
      mouse.x > obj.pos.x &&
      mouse.x < obj.pos.x + obj.dims.width &&
      mouse.y > obj.pos.y &&
      mouse.y < obj.pos.y + obj.dims.height
    ) {
      selectedImageIdx = i;
      imagePosOriginal = {x: obj.pos.x, y: obj.pos.y}
      found = true;
      if (i !== images.length - 1) {
        images.push(images.splice(i, 1)[0]);
        selectedImageIdx = images.length - 1;
      }
      draw(images, selectedImageIdx, cropMode, cropImageIdx, cropRect, doublepage);
      dragging = images.length - 1;
      offsetX = mouse.x - images[dragging].pos.x;
      offsetY = mouse.y - images[dragging].pos.y;
      return;
    }
  }
  if (!found) {
    selectedImageIdx = null;
    draw(images, selectedImageIdx, cropMode, cropImageIdx, cropRect, doublepage);
  }
}

// --- Utility: Get Mouse Position (optionally in screen or canvas coords) ---
function getMouse(e, relative = "canvas") {
  const rect = canvas.getBoundingClientRect();
  let x = (e.clientX - rect.left);
  let y = (e.clientY - rect.top);
  if (relative == "canvas") {
    x = (x - panX) / zoom;
    y = (y - panY) / zoom;
  }
  return { x, y };
}

function handleMouseMove(e) {
  const mouse = getMouse(e);

  if (panning) {
    handleCanvasPan(getMouse(e, "screen"))
  } else if (dragging !== null) {
    // Drag image with snapping
    handleImageDrag(mouse);
  } else if (resizing !== null) {
    // Resize image
    handleImageResize(mouse);
  }
  // Crop drag logic
  if (cropMode && cropImageIdx !== null && cropRect && cropDrag) {
    handleCropDrag(mouse);
    draw();
    return;
  }
}

function handleMouseUp() {
  // Log state variables
  console.log('dragging:', dragging);
  if(dragging)
    console.log('HHHHHHHH')
  console.log('resizing:', resizing);
  console.log('cropMode:', cropMode);
  if (panning) {
    panning = false;
    canvas.style.cursor = '';
    return;
  } else if (dragging != null) {
    if (imagePosOriginal.x !== images[dragging].pos.x || imagePosOriginal.y !== images[dragging].pos.y) {
      images[dragging].actions.storeActionMove(imagePosOriginal.x, imagePosOriginal.y, images[dragging].pos.x, images[dragging].pos.y);
    }
    console.log('Dragging done:', dragging);
  } else if (resizing != null) {
    if (imageScaleOriginal.w !== images[resizing].dims.width || imageScaleOriginal.h !== images[resizing].dims.height) {
      images[resizing].actions.storeActionScale(imageScaleOriginal.w, imageScaleOriginal.h, images[resizing].dims.width, images[resizing].dims.height);
    }
    console.log('Resizing done:', resizing);
  }
  dragging = null;
  resizing = null;
  resizeCorner = null;
  if (cropMode)
    cropDrag = null;
}

function handleDrop(e) {
  e.preventDefault();
  const mouse = getMouse(e);
  canvas.style.border = '';
  Array.from(e.dataTransfer.files).forEach(file => loadImageFile(file, mouse));
}