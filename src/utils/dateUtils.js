// src/utils/dateUtils.js - Date utility functions
import { TIME } from '../config/constants.js';

/**
 * Formats a date into a readable string
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Formats a UNIX timestamp into a readable string
 * @param {number} timestamp - UNIX timestamp in seconds
 * @returns {string} - Formatted date string
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A';
  
  try {
    // Convert seconds to milliseconds
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid Timestamp';
  }
}

/**
 * Checks if a date is within the next 48 hours
 * @param {string} dateString - ISO date string
 * @returns {boolean} - True if date is within next 48 hours
 */
export function isWithinNext48Hours(dateString) {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString).getTime();
    const now = Date.now();
    return date >= now && date <= now + TIME.TWO_DAYS_MS;
  } catch (error) {
    console.error('Error checking date:', error);
    return false;
  }
}

/**
 * Gets a UNIX timestamp for a time in the future
 * @param {number} secondsInFuture - Seconds to add to current time
 * @returns {number} - UNIX timestamp in seconds
 */
export function getFutureTimestamp(secondsInFuture) {
  return Math.floor(Date.now() / 1000) + secondsInFuture;
}

/**
 * Formats a duration in milliseconds to a human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration string
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Calculates time until a specified date
 * @param {string} dateString - ISO date string
 * @returns {string} - Human-readable time until string
 */
export function timeUntil(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const targetDate = new Date(dateString).getTime();
    const now = Date.now();
    const timeLeft = targetDate - now;
    
    if (timeLeft <= 0) {
      return 'Started';
    }
    
    return formatDuration(timeLeft);
  } catch (error) {
    console.error('Error calculating time until:', error);
    return 'Unknown';
  }
}