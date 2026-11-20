import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports a DOM element to a multi-page A4 PDF with clean margins,
 * rendering at a consistent layout width so mobile viewports and
 * horizontally scrollable tables are never clipped.
 */
export async function exportElementToPdf(element, filename) {
  if (!element) return;

  const targetWidth = Math.max(element.scrollWidth, 1024);
  element.setAttribute('data-pdf-export-root', 'true');

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: targetWidth,
      onclone: (clonedDoc) => {
        const clonedRoot = clonedDoc.querySelector('[data-pdf-export-root="true"]');
        if (!clonedRoot) return;

        clonedRoot.style.width = `${targetWidth}px`;
        clonedRoot.style.maxWidth = 'none';
        clonedRoot.style.padding = '20px';
        clonedRoot.style.backgroundColor = '#ffffff';
        clonedRoot.style.boxSizing = 'border-box';

        const scrollContainers = clonedRoot.querySelectorAll(
          '.all-member-info, .meal-form, .details-section, .all-member-list, .other-costs-info, .added-costs-section, .added-deposits-section'
        );
        scrollContainers.forEach((el) => {
          el.style.overflow = 'visible';
          el.style.overflowX = 'visible';
        });
      },
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;

    const pxPerMm = canvas.width / printableWidth;
    const pageHeightPx = Math.floor(printableHeight * pxPerMm);

    let offsetY = 0;
    let pageIndex = 0;

    while (offsetY < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - offsetY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;

      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        offsetY,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );

      if (pageIndex > 0) {
        pdf.addPage();
      }

      const sliceHeightMm = sliceHeightPx / pxPerMm;
      pdf.addImage(
        pageCanvas.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        printableWidth,
        sliceHeightMm
      );

      offsetY += sliceHeightPx;
      pageIndex += 1;
    }

    pdf.save(filename);
  } finally {
    element.removeAttribute('data-pdf-export-root');
  }
}
