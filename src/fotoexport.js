async function cropAndScaleImages() {
    function applyActionsImage(raw_img, idx) {
        return new Promise((resolve) => {
            const image = new window.Image();
            console.log(`Onload starts...`);
            image.onload = () => {
                console.log(`Begins...`);
                console.log('raw_img.actions:', raw_img.actions.actions);
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');
                let cropX = 0, cropY = 0, cropW = image.width, cropH = image.height;
                let dw = image.width, dh = image.height;

                // Find the last crop action, if any
                const lastCrop = [...raw_img.actions.actions].reverse().find(a => a.type === 'crop');
                if (lastCrop) {
                    cropX = lastCrop.x;
                    cropY = lastCrop.y;
                    cropW = lastCrop.w;
                    cropH = lastCrop.h;
                }

                // Find the first and last scale actions
                const firstScale = raw_img.actions.actions.find(a => a.type === 'scale');
                const lastScale = [...raw_img.actions.actions].reverse().find(a => a.type === 'scale');

                let originalW = cropW;
                let originalH = cropH;
                let finalW = cropW;
                let finalH = cropH;

                if (firstScale) {
                    originalW = firstScale.fromW || cropW;
                    originalH = firstScale.fromH || cropH;
                }
                if (lastScale) {
                    finalW = lastScale.toW;
                    finalH = lastScale.toH;
                }

                // Use the ratio between original and final scale
                if (firstScale && lastScale) {
                    const ratioW = finalW / originalW;
                    const ratioH = finalH / originalH;
                    dw = cropW * ratioW;
                    dh = cropH * ratioH;
                }

                console.log(`cropX: ${cropX}, cropY: ${cropY}, cropW: ${cropW}, cropH: ${cropH}, dw: ${dw}, dh: ${dh}`);

                canvas.width = dw;
                canvas.height = dh;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, dw, dh);
                // Use JPEG at max quality, or PNG if you prefer lossless
                resolve(canvas.toDataURL('image/jpeg', 1.0));
            };
            // Robustly set image.src
            if (raw_img.img && raw_img.img.src) {
                image.src = raw_img.img.src;
            } else if (raw_img.file && raw_img.file instanceof Blob) {
                image.src = URL.createObjectURL(raw_img.file);
            } else if (raw_img.src) {
                image.src = raw_img.src;
            } else {
                console.error("No valid image source found for raw_img", raw_img);
            }
        });
    }

    // Process all images in parallel
    return Promise.all(
        images.map((raw_img, idx) => applyActionsImage(raw_img, idx))
    );
}

async function exportFotobok() {
    // Set PDF size to match the first fotopage's dimensions (in points)
    const firstPage = fotopages[0];
    const pageWidth = firstPage?.dims?.w ?? 595; // fallback to A4 width in pt
    const pageHeight = firstPage?.dims?.h ?? 842; // fallback to A4 height in pt

    console.log(`Exporting PDF with page size: ${pageWidth} x ${pageHeight} pt`);

    // Create PDF with custom size
    const doc = new window.jspdf.jsPDF({
        unit: 'pt',
        format: [pageWidth, pageHeight]
    });

    console.log('fotopages:', fotopages);
    console.log('images:', images);

    if (!images || images.length === 0) {
        console.log('No images to export.');
        // No images: just create empty pages for each fotopage
        fotopages.forEach((page, pageIndex) => {
            if (pageIndex > 0) doc.addPage();
            // Optionally, add a placeholder or leave blank
        });
        doc.save("fotobok.pdf");
        return;
    }

    console.log('Process Images Starts...');
    const processedImages = await cropAndScaleImages();
    console.log('Process Images Done.');

    console.log('Add images');
    fotopages.forEach((page, pageIndex) => {
        if (pageIndex > 0) doc.addPage([page.dims?.w ?? pageWidth, page.dims?.h ?? pageHeight]);
        console.log('Rendering page', pageIndex, page);

        // Get page bounds
        const pageX = page.pos?.x ?? 0;
        const pageY = page.pos?.y ?? 0;
        const pageW = page.dims?.w ?? 0;
        const pageH = page.dims?.h ?? 0;

        images.forEach((img, imgIndex) => {
            // Get image placement info
            const placement = {
                x: img.pos?.x ?? 0,
                y: img.pos?.y ?? 0,
                width: img.dims?.width ?? 0,
                height: img.dims?.height ?? 0,
                imageIndex: imgIndex
            };

            // Check if the image overlaps with the page
            const overlaps =
                placement.x < pageX + pageW &&
                placement.x + placement.width > pageX &&
                placement.y < pageY + pageH &&
                placement.y + placement.height > pageY;

            if (overlaps) {
                const imgData = processedImages[placement.imageIndex];
                if (imgData) {
                    // Draw image relative to the page's coordinate system
                    doc.addImage(
                        imgData,
                        'JPEG',
                        placement.x - pageX,
                        placement.y - pageY,
                        placement.width,
                        placement.height
                    );
                }
            }
        });
    });

    doc.save("fotobok.pdf");
}

/**
 * Export all images at their respective size, minimizing the number of pages.
 * Images are arranged row-wise, no rotation, no scaling.
 */
async function exportAllImagesCompact() {
    // Use a default page size (A4 in pt)
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 10; // margin between images

    const doc = new window.jspdf.jsPDF({
        unit: 'pt',
        format: [pageWidth, pageHeight]
    });

    const processedImages = await cropAndScaleImages();

    let x = margin, y = margin, maxRowHeight = 0, pageIndex = 0;

    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const imgData = processedImages[i];
        const imgW = img.dims?.width ?? 0;
        const imgH = img.dims?.height ?? 0;

        // If image doesn't fit in current row, move to next row
        if (x + imgW + margin > pageWidth) {
            x = margin;
            y += maxRowHeight + margin;
            maxRowHeight = 0;
        }
        // If image doesn't fit on current page, add new page
        if (y + imgH + margin > pageHeight) {
            doc.addPage([pageWidth, pageHeight]);
            x = margin;
            y = margin;
            maxRowHeight = 0;
            pageIndex++;
        }

        if (imgData && imgW > 0 && imgH > 0) {
            doc.addImage(
                imgData,
                'JPEG',
                x,
                y,
                imgW,
                imgH
            );
        }
        x += imgW + margin;
        if (imgH > maxRowHeight) maxRowHeight = imgH;
    }

    doc.save("fotobok_compact.pdf");
}

