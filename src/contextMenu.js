// Context Menu for Photobook: Custom context menu for image deletion

function setupContextMenu(canvas, images, draw) {
  // Custom context menu for deleting images
  let contextMenu = document.createElement('div');
  contextMenu.style.position = 'absolute';
  contextMenu.style.display = 'none';
  contextMenu.style.background = '#fff';
  contextMenu.style.border = '1px solid #ccc';
  contextMenu.style.padding = '4px 12px';
  contextMenu.style.cursor = 'pointer';
  contextMenu.style.zIndex = 1000;
  let contextImageIdx = null;
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
  document.body.appendChild(contextMenu);

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
}

function getMouse(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}