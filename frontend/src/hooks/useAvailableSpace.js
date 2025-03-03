import { useState, useEffect, useCallback } from 'react';
import throttle from 'lodash.throttle'; // Import throttle utility

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
  const [lastScrollY, setLastScrollY] = useState(0);
  const [containerTop, setContainerTop] = useState(null);

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
    let currentContainerTop = 0;
    let containerOffset = 0;
    if (containerRef?.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      currentContainerTop = containerRect.top;
      // Consider container's position in the viewport
      containerOffset = Math.max(0, currentContainerTop);
      
      // Only update state if changed significantly (prevents minor fluctuations)
      if (containerTop === null || Math.abs(currentContainerTop - containerTop) > 5) {
        setContainerTop(currentContainerTop);
      }
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
    minHeight,
    containerTop
  ]);

  // Effect to calculate height on mount and when dependencies change
  useEffect(() => {
    // Initial calculation
    calculateHeight();
    
    // Regular resize handler (no throttling needed)
    const handleResize = () => {
      calculateHeight();
    };
    
    // Create a throttled scroll handler (executes at most once per 150ms)
    const handleScrollThrottled = throttle(() => {
      const currentScrollY = window.scrollY;
      
      // Only recalculate if scrolled by a significant amount
      if (Math.abs(currentScrollY - lastScrollY) > 30) {
        setLastScrollY(currentScrollY);
        calculateHeight();
      }
    }, 150);
    
    // Handle orientation changes specifically for mobile
    const handleOrientationChange = () => {
      // Add delay to ensure all layout changes are applied
      setTimeout(calculateHeight, 150);
    };
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('scroll', handleScrollThrottled);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('scroll', handleScrollThrottled);
      // Make sure to cancel any pending throttled executions
      handleScrollThrottled.cancel();
    };
  }, [calculateHeight, lastScrollY]);

  // Calculate height when certain props change
  useEffect(() => {
    calculateHeight();
  }, [isFullscreenPage, isFullscreen, calculateHeight]);

  return { availableHeight, calculateHeight };
} 