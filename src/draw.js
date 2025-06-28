// Photobook: Drawing functions

// Ensure images and other globals are defined to avoid errors on first load
if (typeof images === "undefined") window.images = [];
if (typeof selectedImageIdx === "undefined") window.selectedImageIdx = { value: null };
if (typeof cropMode === "undefined") window.cropMode = false;
if (typeof cropImageIdx === "undefined") window.cropImageIdx = null;
if (typeof cropRect === "undefined") window.cropRect = null;
if (typeof doublepage === "undefined") window.doublepage = false;

function draw(
  imgs = window.images,
  selIdx = window.selectedImageIdx.value,
  cropM = window.cropMode,
  cropImgIdx = window.cropImageIdx,
  cropR = window.cropRect,
  dblpg = window.doublepage
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  imgs.forEach((imgObj, idx) => {
    ctx.drawImage(imgObj.img, imgObj.x, imgObj.y, imgObj.w, imgObj.h);
    if (selIdx === idx && (!cropM || cropImgIdx !== idx)) drawResizeHandles(imgObj);
    if (cropM && cropImgIdx === idx && cropR) drawCropBox(cropR);
  });
  if (dblpg) drawSeparatorLine();
  drawCmScales();
}

// --- Drawing Helpers ---
function drawResizeHandles(imgObj) {
  // Draw resize handles and size label
  const handles = getResizeHandles(imgObj);
  ctx.fillStyle = '#007bff';
  handles.forEach(h => { ctx.beginPath(); ctx.arc(h.x, h.y, 8, 0, 2 * Math.PI); ctx.fill(); });
  const wCm = pxToCm(imgObj.w).toFixed(2), hCm = pxToCm(imgObj.h).toFixed(2);
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
function drawCropBox(rect) {
  ctx.save();
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.setLineDash([]);
  getCropHandles(rect).forEach(h => {
    ctx.beginPath();
    ctx.arc(h.x, h.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff0000';
    ctx.fill();
  });
  getCropEdges(rect).forEach(e => ctx.fillRect(e.x - 4, e.y - 8, 8, 16));
  ctx.restore();
}
function drawSeparatorLine() {
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
}
function drawCmScales() {
  const pxPerCm = 96 / 2.54;
  ctx.save();
  ctx.strokeStyle = '#888';
  ctx.fillStyle = '#444';
  ctx.font = '10px sans-serif';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += pxPerCm) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 8); ctx.stroke();
    if (x > 0) ctx.fillText(Math.round(pxToCm(x)), x + 2, 16);
  }
  for (let y = 0; y <= canvas.height; y += pxPerCm) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(8, y); ctx.stroke();
    if (y > 0) {
      ctx.save(); ctx.translate(16, y + 2); ctx.rotate(-Math.PI / 2);
      ctx.fillText(Math.round(pxToCm(y)), 0, 0); ctx.restore();
    }
  }
  ctx.restore();
}

// --- Helper Functions ---
function pxToCm(px) { return px * 2.54 / 96; }
function getResizeHandles(obj) {
  return [
    { x: obj.x, y: obj.y, corner: 'tl' },
    { x: obj.x + obj.w, y: obj.y, corner: 'tr' },
    { x: obj.x, y: obj.y + obj.h, corner: 'bl' },
    { x: obj.x + obj.w, y: obj.y + obj.h, corner: 'br' }
  ];
}
function getCropHandles(rect) {
  return [
    { x: rect.x, y: rect.y, corner: 'tl' },
    { x: rect.x + rect.w, y: rect.y, corner: 'tr' },
    { x: rect.x, y: rect.y + rect.h, corner: 'bl' },
    { x: rect.x + rect.w, y: rect.y + rect.h, corner: 'br' }
  ];
}
function getCropEdges(rect) {
  return [
    { x: rect.x + rect.w / 2, y: rect.y, edge: 'top' },
    { x: rect.x + rect.w / 2, y: rect.y + rect.h, edge: 'bottom' },
    { x: rect.x, y: rect.y + rect.h / 2, edge: 'left' },
    { x: rect.x + rect.w, y: rect.y + rect.h / 2, edge: 'right' }
  ];
}
function setCanvasSize(width, height) {
  if (!canvas || !canvas.style) return;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = pxToCm(width) + 'cm';
  canvas.style.height = pxToCm(height) + 'cm';
  draw(images, selectedImageIdx.value, cropMode, cropImageIdx, cropRect, doublepage);
}
function setCanvasSizeCm(widthCm, heightCm) {
  const pxPerCm = 96 / 2.54;
  if (!canvas || !canvas.style) return;
  canvas.width = Math.round(widthCm * pxPerCm);
  canvas.height = Math.round(heightCm * pxPerCm);
  canvas.style.width = widthCm + 'cm';
  canvas.style.height = heightCm + 'cm';
  draw(images, selectedImageIdx.value, cropMode, cropImageIdx, cropRect, doublepage);
}