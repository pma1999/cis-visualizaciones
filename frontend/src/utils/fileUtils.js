/**
 * Formats a timestamp into a localized date string
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {string} Formatted date string
 */
export const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString();
};

/**
 * Formats file size from KB to human-readable format
 * @param {number} sizeKB - Size in kilobytes
 * @returns {string} Formatted size string (KB or MB)
 */
export const formatSize = (sizeKB) => {
  return sizeKB < 1024 
    ? `${sizeKB.toFixed(1)} KB` 
    : `${(sizeKB / 1024).toFixed(1)} MB`;
};

/**
 * Shows a notification for a specific duration
 * @param {function} setNotification - State setter function
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default: 3000)
 */
export const showTemporaryNotification = (setNotification, message, duration = 3000) => {
  setNotification(message);
  setTimeout(() => {
    setNotification(null);
  }, duration);
}; 