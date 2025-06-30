
function handleCanvasPan(mouse, panOrigin, panStart) {
    panX = panOrigin.x + (mouse.x - panStart.x);
    panY = panOrigin.y + (mouse.y - panStart.y);
    draw();
    return;
}

function handleScrolling(e) {
    e.preventDefault();
    if (!e.ctrlKey && !e.shiftKey) {
        panY -= e.deltaY*scroll_sensitivity;
    } else if (!e.ctrlKey && e.shiftKey){
        panX -= e.deltaY*scroll_sensitivity;
    }
    else {
        const mouse = getMouse(e, false);
        const prevZoom = zoom;
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        zoom *= zoomFactor;
        zoom = Math.max(0.05, Math.min(zoom, 50));

        // Adjust pan so zoom centers on mouse
        panX = mouse.x - ((mouse.x - panX) * (zoom / prevZoom));
        panY = mouse.y - ((mouse.y - panY) * (zoom / prevZoom));
    }
    draw();
}

function handleCanvasWidthChanged(e) {
    const newWidthCm = parseFloat(e.target.value);
    if (!isNaN(newWidthCm)) {
        defaultWidthCm = cmToPx(newWidthCm);
        fotopage.dims.w = cmToPx(newWidthCm);
        fotopage.center();
        draw();
    }
}

function handleCanvasHeightChanged(e) {
    const newHeightCm = parseFloat(e.target.value);
    if (!isNaN(newHeightCm)) {
        defaultHeightCm = cmToPx(newHeightCm);
        fotopage.dims.h = cmToPx(newHeightCm);
        fotopage.center();
        draw();
    }
}

function handleWindowResize(e) {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();
}

function handleDoublePage(e) {
    doublepage = doublepage_checkbutton.checked;
    if (doublepage && fotopages.length%2 == 1) {
        fotopages.push(new FotoPage(0, 0, cmToPx(defaultWidthCm), cmToPx(defaultHeightCm)));
    } 
    reorderPages();
}

function reorderPages() {
    if (doublepage) {
        fotopages.forEach((page, index) => {
            if (index % 2 == 0) {
                // left page
                page.setPositionAndDims(0, index/2*cmToPx(defaultHeightCm) + (index == 0 ? 0: index*fotopages_margin), cmToPx(defaultWidthCm), cmToPx(defaultHeightCm));
            } else {
                // right page
                page.setPositionAndDims(cmToPx(defaultWidthCm), (index-1)/2*cmToPx(defaultHeightCm) + (index == 1 ? 0: (index-1)*fotopages_margin), cmToPx(defaultWidthCm), cmToPx(defaultHeightCm));
            }
        });
    } else {
        fotopages.forEach((page, index) => {
            page.setPositionAndDims(0, index*cmToPx(defaultHeightCm) + (index == 0 ? 0: index*fotopages_margin), cmToPx(defaultWidthCm), cmToPx(defaultHeightCm));
        });
    }
    draw();
}

function handleAddPage() {
    fotopages.push(new FotoPage(0, 0, cmToPx(defaultWidthCm), cmToPx(defaultHeightCm)));
    if (doublepage) {
        fotopages.push(new FotoPage(0, 0, cmToPx(defaultWidthCm), cmToPx(defaultHeightCm)));
    }
    reorderPages();
}

function handleRemovePage() {
    fotopages.pop();
    if (doublepage) {
        fotopages.pop();
    }
    reorderPages();
}