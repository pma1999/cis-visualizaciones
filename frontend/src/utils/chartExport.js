/**
 * Chart Export Utility
 * Provides robust methods to export Chart.js charts to images
 */

// Helper function for formatted date used in filenames
export const getFormattedDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
};

/**
 * Gets the device pixel ratio for high-quality exports on high-DPI displays
 * @returns {number} The device pixel ratio or 1 if not available
 */
const getDevicePixelRatio = () => {
  return window.devicePixelRatio || 
         window.screen.deviceXDPI / window.screen.logicalXDPI || 1;
};

/**
 * Creates a new canvas with the specified dimensions and returns its context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {boolean} highRes - Whether to create a high-resolution canvas
 * @returns {Object} Object containing the canvas and its context
 */
const createCanvas = (width, height, highRes = true) => {
  const canvas = document.createElement('canvas');
  const dpr = highRes ? getDevicePixelRatio() : 1;
  
  // Set display size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  // Set actual size adjusted for device pixel ratio
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  
  // Get context and scale according to device pixel ratio
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  
  return { canvas, ctx, dpr };
};

/**
 * Renders text with word wrapping within a specified width
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to render
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} maxWidth - Maximum width for text wrapping
 * @param {number} lineHeight - Line height multiplier
 * @returns {number} Y position after the text has been drawn
 */
const renderWrappedText = (ctx, text, x, y, maxWidth, lineHeight = 1.2) => {
  if (!text) return y;
  
  const words = text.split(' ');
  const fontSize = parseInt(ctx.font.split('px')[0], 10) || 12;
  const computedLineHeight = fontSize * lineHeight;
  
  let line = '';
  let currentY = y;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + (line ? ' ' : '') + words[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, x, currentY);
      line = words[i];
      currentY += computedLineHeight;
    } else {
      line = testLine;
    }
  }
  
  ctx.fillText(line, x, currentY);
  return currentY + computedLineHeight;
};

/**
 * Renders the title section (title, subtitle) on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} options - Title options
 * @param {number} width - Canvas width
 * @returns {number} The Y position after the title section
 */
const renderTitleSection = (ctx, options, width) => {
  const { title, subtitle, darkMode } = options;
  const padding = 20;
  let currentY = padding;
  
  // Default title color based on mode
  const titleColor = darkMode ? '#ffffff' : '#333333';
  const subtitleColor = darkMode ? '#cccccc' : '#666666';
  
  // Title
  if (title) {
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = titleColor;
    ctx.textAlign = 'center';
    currentY = renderWrappedText(ctx, title, width / 2, currentY, width - padding * 2) + 5;
  }
  
  // Subtitle
  if (subtitle) {
    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = subtitleColor;
    ctx.textAlign = 'center';
    currentY = renderWrappedText(ctx, subtitle, width / 2, currentY, width - padding * 2) + 10;
  }
  
  return currentY;
};

/**
 * Renders the legend items on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} legendItems - Legend items with color and text
 * @param {Object} options - Legend options
 * @param {number} startY - Starting Y position
 * @param {number} width - Canvas width
 * @returns {number} The Y position after the legend has been drawn
 */
const renderLegendSection = (ctx, legendItems, options, startY, width) => {
  if (!legendItems || legendItems.length === 0) return startY;
  
  const { darkMode } = options;
  const textColor = darkMode ? '#ffffff' : '#333333';
  const padding = 20;
  const itemHeight = 20;
  const boxWidth = 15;
  const boxHeight = 15;
  const boxPadding = 5;
  
  let currentY = startY + 10;
  const legendWidth = width - (padding * 2);
  
  // Calculate layout
  ctx.font = '12px Arial, sans-serif';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  
  // Determine if we need multiple columns for the legend
  // Maximum items per column based on available height
  const maxItemsPerColumn = 10;
  const columns = Math.ceil(legendItems.length / maxItemsPerColumn);
  const itemsPerColumn = Math.ceil(legendItems.length / columns);
  const columnWidth = legendWidth / columns;
  
  legendItems.forEach((item, index) => {
    const column = Math.floor(index / itemsPerColumn);
    const rowInColumn = index % itemsPerColumn;
    
    const x = padding + (column * columnWidth);
    const y = currentY + (rowInColumn * itemHeight);
    
    // Draw color box
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y - boxHeight + 4, boxWidth, boxHeight);
    
    // Draw item text
    ctx.fillStyle = textColor;
    ctx.fillText(item.text, x + boxWidth + boxPadding, y);
  });
  
  // Return the position after the legend
  return currentY + (itemsPerColumn * itemHeight) + 10;
};

/**
 * Renders the footnote text on the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} footnote - Footnote text
 * @param {boolean} darkMode - Dark mode setting
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
const renderFootnoteSection = (ctx, footnote, darkMode, width, height) => {
  if (!footnote) return;
  
  const padding = 20;
  const footnoteColor = darkMode ? '#aaaaaa' : '#888888';
  
  ctx.font = '11px Arial, sans-serif';
  ctx.fillStyle = footnoteColor;
  ctx.textAlign = 'right';
  ctx.fillText(footnote, width - padding, height - padding);
};

/**
 * Creates a background for the canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {boolean} darkMode - Dark mode setting
 */
const renderBackground = (ctx, width, height, darkMode) => {
  ctx.fillStyle = darkMode ? '#1e293b' : '#ffffff';
  ctx.fillRect(0, 0, width, height);
};

/**
 * Main function to export a Chart.js chart as an image
 * @param {Chart} chartInstance - Chart.js chart instance
 * @param {string} filename - Base filename without extension
 * @param {Object} options - Export options
 * @returns {Promise<boolean>} Success status
 */
export const exportChartAsImage = async (chartInstance, filename, options = {}) => {
  if (!chartInstance || !chartInstance.canvas) {
    console.error('Invalid chart instance provided for export');
    return false;
  }
  
  try {
    // Prepare options with defaults
    const exportOptions = {
      // Export format
      format: 'png', // 'png', 'jpeg', 'webp'
      quality: 0.95, // 0-1 quality for jpeg/webp
      
      // Content options
      title: '',
      subtitle: '',
      footnote: '',
      legendItems: [],
      
      // Style options
      darkMode: false,
      padding: 20,
      titleHeight: 60, // Estimated height for title section
      legendHeight: 40, // Estimated height for legend
      
      // Size options
      width: null, // Will use chart width if null
      height: null, // Will use chart height if null
      maxWidth: 3000,
      maxHeight: 3000,
      
      // Override defaults with user options
      ...options
    };
    
    // Temporarily disable animations
    const prevAnimation = chartInstance.options.animation;
    chartInstance.options.animation = false;
    
    // Force a redraw to ensure chart is completely rendered
    chartInstance.update('none');
    chartInstance.render();
    
    // Get the chart canvas and its dimensions
    const chartCanvas = chartInstance.canvas;
    
    // Determine export dimensions
    let exportWidth = exportOptions.width || chartCanvas.width;
    let exportHeight = exportOptions.height || chartCanvas.height;
    
    // Adjust for device pixel ratio if dimensions are from chart
    if (!exportOptions.width) exportWidth = exportWidth / getDevicePixelRatio();
    if (!exportOptions.height) exportHeight = exportHeight / getDevicePixelRatio();
    
    // Ensure dimensions don't exceed maximums
    exportWidth = Math.min(exportWidth, exportOptions.maxWidth);
    exportHeight = Math.min(exportHeight, exportOptions.maxHeight);
    
    // Calculate space needed for metadata
    let metadataHeight = exportOptions.padding * 2; // Top and bottom padding
    
    // Add title height if title or subtitle exist
    if (exportOptions.title || exportOptions.subtitle) {
      metadataHeight += exportOptions.titleHeight;
    }
    
    // Add legend height if legend items exist
    if (exportOptions.legendItems && exportOptions.legendItems.length > 0) {
      metadataHeight += exportOptions.legendHeight;
    }
    
    // Create the composite canvas
    const { canvas, ctx, dpr } = createCanvas(
      exportWidth,
      exportHeight + metadataHeight,
      true // High-resolution
    );
    
    // Draw background
    renderBackground(ctx, exportWidth, exportHeight + metadataHeight, exportOptions.darkMode);
    
    // Draw title section and get the Y position after it
    const titleEndY = renderTitleSection(ctx, exportOptions, exportWidth);
    
    // Calculate space for the chart
    const chartY = titleEndY;
    const chartHeight = exportHeight;
    
    // Draw the chart
    ctx.drawImage(
      chartCanvas,
      0, 0, chartCanvas.width, chartCanvas.height, // Source
      0, chartY, exportWidth, chartHeight          // Destination
    );
    
    // Draw the legend section after the chart if provided
    const legendEndY = renderLegendSection(
      ctx,
      exportOptions.legendItems,
      exportOptions,
      chartY + chartHeight,
      exportWidth
    );
    
    // Draw footnote if provided
    renderFootnoteSection(
      ctx,
      exportOptions.footnote,
      exportOptions.darkMode,
      exportWidth,
      exportHeight + metadataHeight
    );
    
    // Convert canvas to blob
    const fileExt = exportOptions.format.toLowerCase();
    const mimeType = `image/${fileExt}`;
    
    const blob = await new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), mimeType, exportOptions.quality);
    });
    
    if (!blob) throw new Error('Failed to convert canvas to blob');
    
    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.${fileExt}`;
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    // Restore chart animation setting
    chartInstance.options.animation = prevAnimation;
    
    return true;
  } catch (error) {
    console.error('Error exporting chart:', error);
    
    // Attempt to restore chart to original state
    if (chartInstance) {
      chartInstance.options.animation = true;
      chartInstance.update();
    }
    
    return false;
  }
};

/**
 * Backward compatibility function for DOM element export (like tables)
 * This function uses html2canvas to capture DOM elements
 * @param {HTMLElement|Object} element - DOM element or Chart.js instance
 * @param {string} filename - Base filename without extension
 * @param {Object} options - Export options
 * @returns {Promise<boolean>} Success status
 */
export const exportAsImage = async (element, filename, options = {}) => {
  // If it's a Chart.js instance, use the new function
  if (element && element.canvas) {
    return exportChartAsImage(element, filename, options);
  }
  
  // If it's a DOM element, use html2canvas approach
  if (!(element instanceof HTMLElement)) {
    console.error('Invalid element provided for export');
    return false;
  }
  
  try {
    // Dynamically import html2canvas - only load it when needed
    const html2canvas = await import('html2canvas').then(module => module.default);
    
    // Capture the element
    const canvas = await html2canvas(element, options.canvasOptions || {});
    
    // Create a download link
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    return true;
  } catch (error) {
    console.error('Error exporting DOM element as image:', error);
    return false;
  }
}; 