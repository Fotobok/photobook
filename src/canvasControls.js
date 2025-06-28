// canvasControls.js - Canvas controls setup for Photobook app

function setupCanvasControls(setCanvasSizeCm) {

    document.getElementById('set-canvas-cm').onclick = function() {
    const w = parseFloat(document.getElementById('canvas-width-cm').value);
    const h = parseFloat(document.getElementById('canvas-height-cm').value);
    if (w > 0 && h > 0) setCanvasSizeCm(w, h);
  };
  // Set default A4
  document.getElementById('canvas-width-cm').value = 15;
  document.getElementById('canvas-height-cm').value = 21;
  setCanvasSizeCm(15, 21);
}