import { toPng } from 'html-to-image';
import jsPDF from "jspdf";
import { format } from 'date-fns';
 
/**
 * Waits for all images and fonts inside an element to be ready.
 */
async function waitForRender(ms = 2000): Promise<void> {
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, ms));
}
 
/**
 * Captures the full scrollable height of an element by temporarily
 * expanding it, taking the screenshot, then restoring it.
 */
async function captureFullElement(element: HTMLElement): Promise<string> {
  // Save original styles
  const originalOverflow = element.style.overflow;
  const originalHeight = element.style.height;
  const originalMaxHeight = element.style.maxHeight;
 
  // Expand element to show all content (no clipping)
  element.style.overflow = 'visible';
  element.style.height = 'auto';
  element.style.maxHeight = 'none';
 
  // Also expand any parent containers that might clip
  const parents: Array<{ el: HTMLElement; overflow: string; height: string; maxHeight: string }> = [];
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const computed = getComputedStyle(parent);
    if (computed.overflow === 'hidden' || computed.overflow === 'auto' || computed.overflow === 'scroll') {
      parents.push({
        el: parent,
        overflow: parent.style.overflow,
        height: parent.style.height,
        maxHeight: parent.style.maxHeight,
      });
      parent.style.overflow = 'visible';
      parent.style.height = 'auto';
      parent.style.maxHeight = 'none';
    }
    parent = parent.parentElement;
  }
 
  // Wait for any layout reflow and chart animations
  await new Promise(resolve => setTimeout(resolve, 500));
 
  // Get background color from CSS variables
  const bgVar = getComputedStyle(document.documentElement)
    .getPropertyValue('--background')
    .trim();
  const bg = bgVar ? `hsl(${bgVar})` : '#0b0b0f';
 
  const fullWidth = element.scrollWidth;
  const fullHeight = element.scrollHeight;
 
  let dataUrl: string;
  try {
    // Run toPng twice — first call primes the cache, second call is clean
    await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: bg,
      width: fullWidth,
      height: fullHeight,
    });
 
    dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: bg,
      width: fullWidth,
      height: fullHeight,
    });
  } finally {
    // Restore original styles no matter what
    element.style.overflow = originalOverflow;
    element.style.height = originalHeight;
    element.style.maxHeight = originalMaxHeight;
 
    for (const { el, overflow, height, maxHeight } of parents) {
      el.style.overflow = overflow;
      el.style.height = height;
      el.style.maxHeight = maxHeight;
    }
  }
 
  return dataUrl;
}
 
export const exportGraphsAsPNG = async (
  elementId: string 
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Graph container not found");
 
  // Wait for all charts to finish rendering
  await waitForRender(2000);
 
  const dataUrl = await captureFullElement(element);
 
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `audit-logs-graphs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.png`;
  link.click();
};
 
export const exportGraphsAsPDF = async (
  elementId: string
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Graph container not found");
 
  // Wait for all charts to finish rendering
  await waitForRender(2000);
 
  const dataUrl = await captureFullElement(element);
 
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => { img.onload = resolve; });
 
  const pdf = new jsPDF("landscape", "px", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
 
  const ratio = Math.min(pdfWidth / img.width, pdfHeight / img.height);
  const width = img.width * ratio;
  const height = img.height * ratio;
  const x = (pdfWidth - width) / 2;
  const y = (pdfHeight - height) / 2;
 
  pdf.addImage(dataUrl, "PNG", x, y, width, height);
 
  const date = new Date().toISOString().split("T")[0];
  pdf.save(`audit-logs-graphs-${date}.pdf`);
};
 