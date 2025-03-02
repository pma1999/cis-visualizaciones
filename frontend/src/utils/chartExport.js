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
  
  // Create and inject global export style if it doesn't exist
  ensureExportStylesExist();
  
  try {
    // Dynamically import html2canvas - only load it when needed
    const html2canvas = await import('html2canvas').then(module => module.default);
    
    // Determine if we're exporting a table to apply enhanced layout
    const isTable = element.tagName === 'TABLE' || 
                   element.querySelector('table') !== null;
                   
    // Enhanced export options with defaults for tables
    const exportOptions = {
      // Export format
      format: 'png',
      quality: 0.95,
      
      // Content options
      title: '',
      subtitle: '',
      footnote: '',
      
      // Style options
      darkMode: false,
      padding: 20,
      titleHeight: 60, // Space for title if provided
      footerHeight: 40, // Space for footnote if provided
      
      // Override defaults with user options
      ...options
    };
    
    // Configure html2canvas with robust options
    const canvasOptions = {
      logging: false,
      allowTaint: true,
      useCORS: true,
      scale: options.scale || 2,
      backgroundColor: exportOptions.darkMode ? '#1e293b' : '#ffffff',
      ignoreElements: (element) => {
        // Ignore elements that might cause problems
        return element.classList && 
               (element.classList.contains('do-not-export') || 
                element.tagName === 'SCRIPT');
      },
      onclone: (documentClone, element) => {
        // Process problematic colors in the cloned document
        handleProblematicColors(documentClone, exportOptions.darkMode);
        
        // If there are any event handlers needed post-clone, add them here
        if (options.onClone) {
          options.onClone(documentClone, element);
        }
      },
      // Improve rendering performance
      removeContainer: true,
      // Disable features that might cause issues with color parsing
      foreignObjectRendering: false,
      // Merge in any user-provided canvas options
      ...(options.canvasOptions || {})
    };
    
    // Add a class to the body to indicate export mode
    document.body.classList.add('html2canvas-export-mode');
    
    // First, capture the element using html2canvas
    const elementCanvas = await html2canvas(element, canvasOptions);
    
    // Remove the export mode class
    document.body.classList.remove('html2canvas-export-mode');
    
    // For simple exports or when no metadata is provided, just use the captured canvas
    if (!isTable || (!exportOptions.title && !exportOptions.subtitle && !exportOptions.footnote)) {
      // Create a download link directly from the captured canvas
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = elementCanvas.toDataURL('image/png');
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    }
    
    // For tables with metadata, create a composite canvas with title and footnote sections
    
    // Calculate space needed for metadata
    let metadataHeight = exportOptions.padding * 2; // Top and bottom padding
    
    // Add title height if title or subtitle exists
    if (exportOptions.title || exportOptions.subtitle) {
      metadataHeight += exportOptions.titleHeight;
    }
    
    // Add footer height if footnote exists
    if (exportOptions.footnote) {
      metadataHeight += exportOptions.footerHeight;
    }
    
    // Get dimensions of the captured element
    const elementWidth = elementCanvas.width;
    const elementHeight = elementCanvas.height;
    
    // Create the composite canvas with additional space for metadata
    const { canvas: compositeCanvas, ctx, dpr } = createCanvas(
      elementWidth / canvasOptions.scale,
      (elementHeight / canvasOptions.scale) + metadataHeight,
      true // High-resolution
    );
    
    // Draw background
    renderBackground(
      ctx, 
      elementWidth / canvasOptions.scale, 
      (elementHeight / canvasOptions.scale) + metadataHeight, 
      exportOptions.darkMode
    );
    
    // Draw title section and get the Y position after it
    const titleEndY = renderTitleSection(ctx, exportOptions, elementWidth / canvasOptions.scale);
    
    // Draw the captured element
    ctx.drawImage(
      elementCanvas,
      0, 0, elementWidth, elementHeight, // Source
      0, titleEndY, elementWidth / canvasOptions.scale, elementHeight / canvasOptions.scale // Destination
    );
    
    // Draw footnote if provided
    if (exportOptions.footnote) {
      renderFootnoteSection(
        ctx,
        exportOptions.footnote,
        exportOptions.darkMode,
        elementWidth / canvasOptions.scale,
        (elementHeight / canvasOptions.scale) + metadataHeight
      );
    }
    
    // Create download link from the composite canvas
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = compositeCanvas.toDataURL('image/png');
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    // Remove the export mode class in case of error
    document.body.classList.remove('html2canvas-export-mode');
    console.error('Error exporting DOM element as image:', error);
    return false;
  }
};

/**
 * Ensures the global export styles are added to the document
 */
const ensureExportStylesExist = () => {
  // Check if the styles already exist
  if (document.getElementById('html2canvas-export-styles')) {
    return;
  }
  
  // Create styles for the export mode
  const styleEl = document.createElement('style');
  styleEl.id = 'html2canvas-export-styles';
  styleEl.textContent = `
    /* Global styles for html2canvas export mode */
    .html2canvas-export-mode *,
    .html2canvas-export-mode *::before,
    .html2canvas-export-mode *::after {
      /* Disable problematic color formats during export */
      color: var(--safe-text-color, initial) !important;
      background-color: var(--safe-bg-color, initial) !important;
      border-color: var(--safe-border-color, initial) !important;
      fill: var(--safe-fill-color, initial) !important;
      stroke: var(--safe-stroke-color, initial) !important;
      
      /* Ensure no animation or transition during export */
      animation: none !important;
      transition: none !important;
      
      /* Ensure visibility */
      visibility: visible !important;
      
      /* Disable filter effects that might cause issues */
      filter: none !important;
    }
    
    /* Specific overrides for tables during export */
    .html2canvas-export-mode table {
      border-collapse: collapse !important;
    }
    
    /* Ensure rows are visible */
    .html2canvas-export-mode tr {
      break-inside: avoid !important;
    }
    
    /* Set safe variables for light/dark modes */
    :root {
      --safe-text-color: #0f172a;
      --safe-bg-color: #ffffff;
      --safe-border-color: #cbd5e1;
      --safe-fill-color: #475569;
      --safe-stroke-color: #64748b;
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --safe-text-color: #e2e8f0;
        --safe-bg-color: #1e293b;
        --safe-border-color: #475569;
        --safe-fill-color: #94a3b8;
        --safe-stroke-color: #64748b;
      }
    }
  `;
  
  // Add the style element to the document head
  document.head.appendChild(styleEl);
};

/**
 * Pre-processes an element before export to handle color issues
 * @param {HTMLElement} element - The DOM element to process
 * @param {Object} options - Export options
 * @returns {HTMLElement} The processed element
 */
const preprocessElementForExport = async (element, options) => {
  return new Promise(resolve => {
    // Create a clone of the element to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Process all elements with potentially problematic colors
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      
      // Check for problematic color formats
      replaceProblematicColors(el, computedStyle, options.darkMode);
    });
    
    // Short timeout to ensure all style changes are applied
    setTimeout(() => resolve(clone), 50);
  });
};

/**
 * Processes all elements in a document to replace problematic colors
 * @param {Document} documentClone - The cloned document
 * @param {boolean} darkMode - Whether dark mode is enabled
 */
const handleProblematicColors = (documentClone, darkMode) => {
  // First, add a global style override to force standard RGB colors
  const globalStyleEl = documentClone.createElement('style');
  globalStyleEl.textContent = `
    /* Global color overrides to prevent problematic color formats */
    * {
      color-scheme: ${darkMode ? 'dark' : 'light'} !important;
    }
    
    /* Force all colors to use standard hex format */
    [class*="text-"], [class*="bg-"], [class*="border-"], 
    [class*="fill-"], [class*="stroke-"], [class*="from-"], 
    [class*="to-"], [class*="via-"] {
      color: ${darkMode ? '#e2e8f0' : '#0f172a'} !important;
      background-color: ${darkMode ? '#1e293b' : '#f8fafc'} !important;
      border-color: ${darkMode ? '#475569' : '#cbd5e1'} !important;
      fill: ${darkMode ? '#94a3b8' : '#475569'} !important;
      stroke: ${darkMode ? '#64748b' : '#64748b'} !important;
    }
    
    /* Override any potentially problematic color classes */
    .html2canvas-dark-safe {
      color: #e2e8f0 !important;
      background-color: #1e293b !important;
      border-color: #475569 !important;
      fill: #94a3b8 !important;
      stroke: #64748b !important;
    }
    .html2canvas-light-safe {
      color: #0f172a !important;
      background-color: #f8fafc !important;
      border-color: #cbd5e1 !important;
      fill: #475569 !important;
      stroke: #64748b !important;
    }
    
    /* Table-specific overrides */
    table, th, td {
      border-color: ${darkMode ? '#475569' : '#cbd5e1'} !important;
    }
    
    /* Ensure proper text contrast */
    th, td {
      color: ${darkMode ? '#e2e8f0' : '#0f172a'} !important;
    }
    
    /* Header styles */
    thead th, th {
      background-color: ${darkMode ? '#334155' : '#e2e8f0'} !important;
    }
    
    /* Row alternating colors */
    tr:nth-child(even) {
      background-color: ${darkMode ? '#1e293b' : '#f8fafc'} !important;
    }
    
    tr:nth-child(odd) {
      background-color: ${darkMode ? '#0f172a' : '#ffffff'} !important;
    }
  `;
  documentClone.head.appendChild(globalStyleEl);
  
  // Process all elements to catch any inline styles with problematic colors
  const allElements = documentClone.querySelectorAll('*');
  
  allElements.forEach(el => {
    // First add a safe color class to all elements with potential color classes
    if (el.classList && el.classList.length > 0) {
      el.classList.add(darkMode ? 'html2canvas-dark-safe' : 'html2canvas-light-safe');
    }
    
    // Then process inline styles
    if (el.style && el.style.length > 0) {
      // Get all style properties
      for (let i = 0; i < el.style.length; i++) {
        const prop = el.style[i];
        const value = el.style[prop];
        
        // Check for problematic color formats in any style property
        if (value && typeof value === 'string' && (
            value.includes('oklch') || 
            value.includes('oklab') || 
            value.includes('lab(') || 
            value.includes('lch(') ||
            value.includes('color(')
          )) {
          // Replace with a safe color
          el.style[prop] = getSafeColor(prop, darkMode);
        }
      }
    }
    
    // Also replace any color-related attributes
    if (el.hasAttribute('fill')) {
      const fill = el.getAttribute('fill');
      if (fill.includes('oklch') || fill.includes('oklab') || fill.includes('lch(') || fill.includes('lab(')) {
        el.setAttribute('fill', darkMode ? '#94a3b8' : '#475569');
      }
    }
    
    if (el.hasAttribute('stroke')) {
      const stroke = el.getAttribute('stroke');
      if (stroke.includes('oklch') || stroke.includes('oklab') || stroke.includes('lch(') || stroke.includes('lab(')) {
        el.setAttribute('stroke', darkMode ? '#64748b' : '#64748b');
      }
    }
  });
};

/**
 * Checks if an element might have problematic color classes
 * @param {HTMLElement} el - The element to check
 * @returns {boolean} Whether the element has potentially problematic classes
 */
const hasProblematicColorClasses = (el) => {
  if (!el.classList) return false;
  
  // Common Tailwind class patterns that might use OKLCH colors
  const problematicPatterns = [
    'bg-', 'text-', 'border-', 'fill-', 'stroke-',
    'from-', 'to-', 'via-', 'shadow-', 'ring-'
  ];
  
  return Array.from(el.classList).some(cls => 
    problematicPatterns.some(pattern => cls.startsWith(pattern))
  );
};

/**
 * Replaces problematic color values in an element's styles
 * @param {HTMLElement} el - The element to process
 * @param {CSSStyleDeclaration} computedStyle - The computed style of the element
 * @param {boolean} darkMode - Whether dark mode is enabled
 */
const replaceProblematicColors = (el, computedStyle, darkMode) => {
  // Define problematic color formats
  const problematicColorFormats = ['oklch', 'oklab', 'lch', 'lab', 'color('];
  
  // Check common properties for problematic colors
  const properties = [
    { cssName: 'backgroundColor', elProp: 'backgroundColor' },
    { cssName: 'color', elProp: 'color' },
    { cssName: 'borderColor', elProp: 'borderColor' },
    { cssName: 'fill', elProp: 'fill' },
    { cssName: 'stroke', elProp: 'stroke' }
  ];
  
  properties.forEach(({ cssName, elProp }) => {
    const value = computedStyle[cssName];
    if (value && value !== 'none' && problematicColorFormats.some(format => 
      value.includes(format)
    )) {
      el.style[elProp] = getSafeColor(cssName, darkMode);
    }
  });
};

/**
 * Returns a safe color for a given property based on dark mode
 * @param {string} property - The CSS property name
 * @param {boolean} darkMode - Whether dark mode is enabled
 * @returns {string} A safe color value
 */
const getSafeColor = (property, darkMode) => {
  if (darkMode) {
    // Dark mode safe colors
    switch (property) {
      case 'color':
      case 'textColor':
        return '#e2e8f0'; // Light gray for text
      case 'backgroundColor':
      case 'background':
        return '#1e293b'; // Dark blue gray for backgrounds
      case 'borderColor':
      case 'border':
        return '#475569'; // Medium gray for borders
      case 'fill':
        return '#94a3b8'; // Medium light gray for SVG fills
      case 'stroke':
        return '#64748b'; // Medium gray for SVG strokes
      default:
        return '#334155'; // Default safe color for dark mode
    }
  } else {
    // Light mode safe colors
    switch (property) {
      case 'color':
      case 'textColor':
        return '#0f172a'; // Dark gray for text
      case 'backgroundColor':
      case 'background':
        return '#f8fafc'; // Very light gray for backgrounds
      case 'borderColor':
      case 'border':
        return '#cbd5e1'; // Light gray for borders
      case 'fill':
        return '#475569'; // Medium gray for SVG fills
      case 'stroke':
        return '#64748b'; // Medium gray for SVG strokes
      default:
        return '#f1f5f9'; // Default safe color for light mode
    }
  }
}; 