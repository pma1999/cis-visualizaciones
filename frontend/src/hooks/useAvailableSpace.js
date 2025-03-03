import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to calculate available vertical space for chart components
 * Considers container dimensions, header height, toolbar, and other UI elements
 * 
 * @param {Object} options Options for the hook
 * @param {React.RefObject} options.containerRef Reference to the container element
 * @param {React.RefObject} options.headerRef Reference to the header element if present
 * @param {React.RefObject} options.toolbarRef Reference to the toolbar element
 * @param {boolean} options.isFullscreenPage Whether the chart is displayed in fullscreen page mode
 * @param {boolean} options.isFullscreen Whether the chart is in fullscreen mode
 * @param {number} options.defaultHeight Default height to use when calculation isn't possible
 * @param {number} options.additionalOffset Additional offset to subtract from the calculated height
 * @param {number} options.minHeight Minimum height the chart should have
 * @returns {Object} Object containing available height and update function
 */
export default function useAvailableSpace({
  containerRef,
  headerRef,
  toolbarRef,
  isFullscreenPage = false,
  isFullscreen = false,
  defaultHeight = 500,
  additionalOffset = 20,
  minHeight = 250
}) {
  const [availableHeight, setAvailableHeight] = useState(defaultHeight);

  // Calculate the available height based on viewport and element measurements
  const calculateHeight = useCallback(() => {
    // If in fullscreen or fullscreen page mode, use a large value as height
    if (isFullscreen || isFullscreenPage) {
      setAvailableHeight(window.innerHeight);
      return;
    }

    // Get viewport dimensions
    const viewportHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // Set different offsets based on screen size
    const viewportSafetyOffset = windowWidth < 480 ? 30 : 20;
    
    // Get container position if available
    let containerTop = 0;
    let containerOffset = 0;
    if (containerRef?.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      containerTop = containerRect.top;
      // Consider container's position in the viewport
      containerOffset = Math.max(0, containerTop);
    }
    
    // Get header height if available
    let headerHeight = 0;
    if (headerRef?.current) {
      headerHeight = headerRef.current.getBoundingClientRect().height;
    }
    
    // Get toolbar height if available
    let toolbarHeight = 0;
    if (toolbarRef?.current) {
      toolbarHeight = toolbarRef.current.getBoundingClientRect().height;
    }
    
    // Additional vertical elements (margins, paddings, etc.)
    // These values are estimates and can be adjusted based on your UI
    const additionalVerticalElements = windowWidth < 480 ? 40 : 30;
    
    // Calculate the total offset
    const totalOffset = containerOffset + headerHeight + additionalVerticalElements + additionalOffset;
    
    // Calculate the available height
    let calculatedHeight = viewportHeight - totalOffset - viewportSafetyOffset;
    
    // Ensure minimum height
    calculatedHeight = Math.max(calculatedHeight, minHeight);
    
    // On very small screens or when calculation fails, use a reasonable default
    if (calculatedHeight <= 0 || !isFinite(calculatedHeight)) {
      calculatedHeight = windowWidth < 640 ? 350 : defaultHeight;
    }
    
    // For horizontal mobile, use a larger value
    if (windowWidth < 640 && window.innerWidth > window.innerHeight) {
      calculatedHeight = Math.min(calculatedHeight, 350); // Limit height in landscape
    }
    
    // Update the state
    setAvailableHeight(calculatedHeight);
  }, [
    containerRef, 
    headerRef, 
    toolbarRef, 
    isFullscreenPage, 
    isFullscreen, 
    defaultHeight,
    additionalOffset,
    minHeight
  ]);

  // Effect to calculate height on mount and when dependencies change
  useEffect(() => {
    // Initial calculation
    calculateHeight();
    
    // Recalculate on resize and orientation change
    const handleResize = () => {
      calculateHeight();
    };
    
    // Recalculate when viewport size changes
    window.addEventListener('resize', handleResize);
    
    // Handle orientation changes specifically for mobile
    window.addEventListener('orientationchange', () => {
      // Add delay to ensure all layout changes are applied
      setTimeout(calculateHeight, 150);
    });
    
    // Recalculate on scroll in case container position changes
    window.addEventListener('scroll', calculateHeight);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('scroll', calculateHeight);
    };
  }, [calculateHeight]);

  // Calculate height when certain props change
  useEffect(() => {
    calculateHeight();
  }, [isFullscreenPage, isFullscreen, calculateHeight]);

  return { availableHeight, calculateHeight };
} 