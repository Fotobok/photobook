// Crop Logic Module

var cropMode = false, cropImageIdx = null, cropRect = null, cropDrag = null;
var cropOffset = {x: 0, y: 0};

// --- Crop Logic Functions ---
function handleCropMouseDown(mouse) {
  // Handles crop rect drag/resize
  const handles = getCropHandles(cropRect);
  for (let h of handles) {
    if (Math.hypot(mouse.x - h.x, mouse.y - h.y) <= 10) {
      cropDrag = { type: 'corner', corner: h.corner };
      cropOffset.x = mouse.x - h.x;
      cropOffset.y = mouse.y - h.y;
      return true;
    }
  }
  const edges = getCropEdges(cropRect);
  for (let ed of edges) {
    if (ed.edge === 'top' || ed.edge === 'bottom') {
      if (Math.abs(mouse.x - ed.x) < cropRect.w / 2 && Math.abs(mouse.y - ed.y) < 12) {
        cropDrag = { type: 'edge', edge: ed.edge };
        cropOffset.y = mouse.y - ed.y;
        return true;
      }
    } else {
      if (Math.abs(mouse.y - ed.y) < cropRect.h / 2 && Math.abs(mouse.x - ed.x) < 12) {
        cropDrag = { type: 'edge', edge: ed.edge };
        cropOffset.x = mouse.x - ed.x;
        return true;
      }
    }
  }
  if (
    mouse.x > cropRect.x && mouse.x < cropRect.x + cropRect.w &&
    mouse.y > cropRect.y && mouse.y < cropRect.y + cropRect.h
  ) {
    cropDrag = { type: 'move' };
    cropOffset.x = mouse.x - cropRect.x;
    cropOffset.y = mouse.y - cropRect.y;
    return true;
  }
  return false;
}
function handleCropDrag(mouse) {
  // Handles crop rect move/resize
  let r = { ...cropRect }, minW = 30, minH = 30, obj = images[cropImageIdx];
  if (cropDrag.type === 'move') {
    let nx = mouse.x - cropOffset.x, ny = mouse.y - cropOffset.y;
    nx = Math.max(obj.pos.x, Math.min(nx, obj.pos.x + obj.dims.width - r.w));
    ny = Math.max(obj.pos.y, Math.min(ny, obj.pos.y + obj.dims.height - r.h));
    cropRect.x = nx; cropRect.y = ny;
  } else if (cropDrag.type === 'corner') {
    let mx = mouse.x - cropOffset.x, my = mouse.y - cropOffset.y;
    if (cropDrag.corner === 'tl') {
      let nx = Math.min(mouse.x - cropOffset.x, r.x + r.w - minW), ny = Math.min(mouse.y - cropOffset.y, r.y + r.h - minH);
      let nw = (r.x + r.w) - nx, nh = (r.y + r.h) - ny;
      if (nx < obj.pos.x) { nx = obj.pos.x; nw = (r.x + r.w) - nx; }
      if (ny < obj.pos.y) { ny = obj.pos.y; nh = (r.y + r.h) - ny; }
      if (nw >= minW && nh >= minH) { cropRect.x = nx; cropRect.y = ny; cropRect.w = nw; cropRect.h = nh; }
    } else if (cropDrag.corner === 'tr') {
      let ny = Math.min(mouse.y - cropOffset.y, r.y + r.h - minH), nw = Math.max(minW, mouse.x - r.x - cropOffset.x), nh = (r.y + r.h) - ny;
      if (mouse.x > obj.pos.x + obj.dims.width) nw = obj.pos.x + obj.dims.width - r.x;
      if (ny < obj.pos.y) { ny = obj.pos.y; nh = (r.y + r.h) - ny; }
      if (nw >= minW && nh >= minH) { cropRect.y = ny; cropRect.w = nw; cropRect.h = nh; }
    } else if (cropDrag.corner === 'bl') {
      let nx = Math.min(mouse.x - cropOffset.x, r.x + r.w - minW), nw = (r.x + r.w) - nx, nh = Math.max(minH, mouse.y - r.y - cropOffset.y);
      if (nx < obj.pos.x) { nx = obj.pos.x; nw = (r.x + r.w) - nx; }
      if (mouse.y > obj.pos.y + obj.dims.height) nh = obj.pos.y + obj.dims.height - r.y;
      if (nw >= minW && nh >= minH) { cropRect.x = nx; cropRect.w = nw; cropRect.h = nh; }
    } else if (cropDrag.corner === 'br') {
      let nw = Math.max(minW, mouse.x - r.x - cropOffset.x), nh = Math.max(minH, mouse.y - r.y - cropOffset.y);
      if (mouse.x > obj.pos.x + obj.dims.width) nw = obj.pos.x + obj.dims.width - r.x;
      if (mouse.y > obj.pos.y + obj.dims.height) nh = obj.pos.y + obj.dims.height - r.y;
      if (nw >= minW && nh >= minH) { cropRect.w = nw; cropRect.h = nh; }
    }
  } else if (cropDrag.type === 'edge') {
    if (cropDrag.edge === 'top') {
      let ny = Math.min(mouse.y - cropOffset.y, r.y + r.h - minH);
      if (ny < obj.pos.y) ny = obj.pos.y;
      let nh = (r.y + r.h) - ny;
      if (nh >= minH) { cropRect.y = ny; cropRect.h = nh; }
    } else if (cropDrag.edge === 'bottom') {
      let nh = Math.max(minH, mouse.y - r.y - cropOffset.y);
      if (mouse.y > obj.pos.y + obj.dims.height) nh = obj.pos.y + obj.dims.height - r.y;
      if (nh >= minH) { cropRect.h = nh; }
    } else if (cropDrag.edge === 'left') {
      let nx = Math.min(mouse.x - cropOffset.x, r.x + r.w - minW);
      if (nx < obj.pos.x) nx = obj.pos.x;
      let nw = (r.x + r.w) - nx;
      if (nw >= minW) { cropRect.x = nx; cropRect.w = nw; }
    } else if (cropDrag.edge === 'right') {
      let nw = Math.max(minW, mouse.x - r.x - cropOffset.x);
      if (mouse.x > obj.pos.x + obj.dims.width) nw = obj.pos.x + obj.dims.width - r.x;
      if (nw >= minW) { cropRect.w = nw; }
    }
  }
}
function handleDoubleClick(e, canvas, images, draw) {
  const mouse = getMouse(e);
  if (!cropMode) {
    for (let i = images.length - 1; i >= 0; i--) {
      const obj = images[i];
      if (mouse.x > obj.pos.x && mouse.x < obj.pos.x + obj.dims.width && mouse.y > obj.pos.y && mouse.y < obj.pos.y + obj.dims.height) {
        cropMode = true;
        cropImageIdx = i;
        cropRect = {
          x: obj.pos.x + obj.dims.width * 0.1,
          y: obj.pos.y + obj.dims.height * 0.1,
          w: obj.dims.width * 0.8,
          h: obj.dims.height * 0.8
        };
        cropDrag = null;
        draw();
        return;
      }
    }
  } else if (cropMode && cropImageIdx !== null) {
    // Apply crop
    const obj = images[cropImageIdx];
    const cropX = (cropRect.x - obj.pos.x) * (obj.img.width / obj.dims.width);
    const cropY = (cropRect.y - obj.pos.y) * (obj.img.height / obj.dims.height);
    const cropW = cropRect.w * (obj.img.width / obj.dims.width);
    const cropH = cropRect.h * (obj.img.height / obj.dims.height);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.max(1, Math.round(cropW));
    tempCanvas.height = Math.max(1, Math.round(cropH));
    tempCanvas.getContext('2d').drawImage(obj.img, cropX, cropY, cropW, cropH, 0, 0, tempCanvas.width, tempCanvas.height);
    const croppedImg = new window.Image();
    croppedImg.onload = () => {
      obj.img = croppedImg;
      obj.pos.x = cropRect.x;
      obj.pos.y = cropRect.y;
      obj.dims.width = cropRect.w;
      obj.dims.height = cropRect.h;
      cropMode = false;
      cropImageIdx = null;
      cropRect = null;
      cropDrag = null;
      draw();
    };
    croppedImg.src = tempCanvas.toDataURL();
  }
}