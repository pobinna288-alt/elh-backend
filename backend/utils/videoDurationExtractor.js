/**
 * El Hannora - Video Duration Extraction Utility
 * 
 * Extracts video duration from uploaded media files using server-side processing.
 * NEVER trusts frontend-provided duration values.
 * 
 * Supports multiple extraction methods:
 * 1. ffprobe (recommended for production)
 * 2. fluent-ffmpeg npm package
 * 3. Fallback: media file header parsing
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── Configuration ────────────────────────────────────────────────────────

/**
 * Supported video formats
 */
const SUPPORTED_VIDEO_FORMATS = [
  '.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v', '.flv', '.wmv', '.3gp'
];

/**
 * Maximum file size for video upload (500 MB)
 */
const MAX_VIDEO_FILE_SIZE_BYTES = 500 * 1024 * 1024;

/**
 * Path to ffprobe executable (adjust for your system)
 * On Windows, you might need to specify the full path
 * On Linux/Mac, usually just 'ffprobe' works if it's in PATH
 */
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';


// ─── Duration Extraction Functions ────────────────────────────────────────

/**
 * Extract video duration using ffprobe
 * This is the most reliable method for production
 * 
 * @param {string} videoPath - Absolute path to the video file
 * @returns {Promise<Object>} Duration result
 */
function extractDurationWithFFProbe(videoPath) {
  return new Promise((resolve, reject) => {
    // Escape the path for shell execution
    const escapedPath = videoPath.replace(/"/g, '\\"');
    
    // FFProbe command to get duration in JSON format
    const command = `"${FFPROBE_PATH}" -v quiet -print_format json -show_format -show_streams "${escapedPath}"`;

    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        // FFProbe not available or command failed
        reject({
          success: false,
          error: 'FFProbe extraction failed',
          details: error.message,
          fallback_recommended: true
        });
        return;
      }

      try {
        const metadata = JSON.parse(stdout);
        let duration = null;

        // Try to get duration from format
        if (metadata.format && metadata.format.duration) {
          duration = parseFloat(metadata.format.duration);
        }
        
        // Fallback: try to get duration from video stream
        if (!duration && metadata.streams) {
          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          if (videoStream && videoStream.duration) {
            duration = parseFloat(videoStream.duration);
          }
        }

        if (duration !== null && !isNaN(duration)) {
          resolve({
            success: true,
            duration_seconds: Math.round(duration * 100) / 100, // Round to 2 decimals
            duration_formatted: formatDuration(duration),
            method: 'ffprobe',
            metadata: {
              format: metadata.format?.format_name,
              bit_rate: metadata.format?.bit_rate,
              size: metadata.format?.size,
              codec: metadata.streams?.find(s => s.codec_type === 'video')?.codec_name
            }
          });
        } else {
          reject({
            success: false,
            error: 'Could not extract duration from metadata',
            fallback_recommended: true
          });
        }
      } catch (parseError) {
        reject({
          success: false,
          error: 'Failed to parse FFProbe output',
          details: parseError.message,
          fallback_recommended: true
        });
      }
    });
  });
}

/**
 * Extract video duration using fluent-ffmpeg npm package
 * Alternative method if ffprobe direct call fails
 * 
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} Duration result
 */
async function extractDurationWithFluentFFmpeg(videoPath) {
  try {
    // Try to require fluent-ffmpeg (must be installed)
    const ffmpeg = require('fluent-ffmpeg');
    
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject({
            success: false,
            error: 'fluent-ffmpeg extraction failed',
            details: err.message
          });
          return;
        }

        const duration = metadata.format?.duration;
        if (duration !== undefined && !isNaN(duration)) {
          resolve({
            success: true,
            duration_seconds: Math.round(duration * 100) / 100,
            duration_formatted: formatDuration(duration),
            method: 'fluent-ffmpeg',
            metadata: {
              format: metadata.format?.format_name,
              bit_rate: metadata.format?.bit_rate,
              size: metadata.format?.size
            }
          });
        } else {
          reject({
            success: false,
            error: 'No duration in metadata'
          });
        }
      });
    });
  } catch (moduleError) {
    return {
      success: false,
      error: 'fluent-ffmpeg module not installed',
      details: 'Run: npm install fluent-ffmpeg'
    };
  }
}

/**
 * Simple MP4 header parsing fallback
 * Less reliable but doesn't require ffmpeg installation
 * Only works with MP4/MOV files
 * 
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} Duration result
 */
async function extractDurationFromMP4Header(videoPath) {
  return new Promise((resolve, reject) => {
    const ext = path.extname(videoPath).toLowerCase();
    if (ext !== '.mp4' && ext !== '.m4v' && ext !== '.mov') {
      reject({
        success: false,
        error: 'Header parsing only supports MP4/M4V/MOV files'
      });
      return;
    }

    fs.open(videoPath, 'r', (err, fd) => {
      if (err) {
        reject({
          success: false,
          error: 'Could not open file',
          details: err.message
        });
        return;
      }

      // Read first 1MB to find moov/mvhd atoms
      const buffer = Buffer.alloc(1024 * 1024);
      fs.read(fd, buffer, 0, buffer.length, 0, (readErr, bytesRead) => {
        fs.close(fd, () => {});

        if (readErr) {
          reject({
            success: false,
            error: 'Could not read file',
            details: readErr.message
          });
          return;
        }

        try {
          const duration = parseMP4Duration(buffer.slice(0, bytesRead));
          if (duration !== null) {
            resolve({
              success: true,
              duration_seconds: Math.round(duration * 100) / 100,
              duration_formatted: formatDuration(duration),
              method: 'mp4-header-parse',
              metadata: { format: 'mp4' }
            });
          } else {
            reject({
              success: false,
              error: 'Could not find duration in MP4 header'
            });
          }
        } catch (parseErr) {
          reject({
            success: false,
            error: 'Failed to parse MP4 header',
            details: parseErr.message
          });
        }
      });
    });
  });
}

/**
 * Parse MP4 moov/mvhd atom to extract duration
 * @param {Buffer} buffer - File buffer
 * @returns {number|null} Duration in seconds or null
 */
function parseMP4Duration(buffer) {
  // Find 'mvhd' atom
  const mvhdSignature = Buffer.from('mvhd');
  let offset = 0;

  while (offset < buffer.length - 8) {
    // Look for 'mvhd' signature
    if (buffer.slice(offset + 4, offset + 8).equals(mvhdSignature)) {
      // Found mvhd atom
      const version = buffer.readUInt8(offset + 8);
      let timescale, duration;

      if (version === 0) {
        // 32-bit values
        timescale = buffer.readUInt32BE(offset + 20);
        duration = buffer.readUInt32BE(offset + 24);
      } else {
        // 64-bit values
        timescale = buffer.readUInt32BE(offset + 28);
        // Read 64-bit duration (using only lower 32 bits for simplicity)
        duration = buffer.readUInt32BE(offset + 36);
      }

      if (timescale > 0 && duration > 0) {
        return duration / timescale;
      }
    }
    offset++;
  }

  return null;
}


// ─── Main Extraction Function ────────────────────────────────────────────

/**
 * Extract video duration with automatic fallback
 * Tries multiple methods in order of reliability
 * 
 * SECURITY: This function MUST be used instead of trusting frontend values
 * 
 * @param {string} videoPath - Path to uploaded video file
 * @returns {Promise<Object>} Extraction result
 */
async function extractVideoDuration(videoPath) {
  // Validate file exists
  if (!fs.existsSync(videoPath)) {
    return {
      success: false,
      error: 'Video file not found',
      path: videoPath
    };
  }

  // Validate file extension
  const ext = path.extname(videoPath).toLowerCase();
  if (!SUPPORTED_VIDEO_FORMATS.includes(ext)) {
    return {
      success: false,
      error: `Unsupported video format: ${ext}`,
      supported_formats: SUPPORTED_VIDEO_FORMATS
    };
  }

  // Validate file size
  const stats = fs.statSync(videoPath);
  if (stats.size > MAX_VIDEO_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `File too large. Maximum size: ${MAX_VIDEO_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
      actual_size_mb: (stats.size / (1024 * 1024)).toFixed(2)
    };
  }

  // Try extraction methods in order
  const methods = [
    { name: 'ffprobe', fn: extractDurationWithFFProbe },
    { name: 'fluent-ffmpeg', fn: extractDurationWithFluentFFmpeg },
    { name: 'mp4-header', fn: extractDurationFromMP4Header }
  ];

  for (const method of methods) {
    try {
      const result = await method.fn(videoPath);
      if (result.success) {
        console.log(`[VideoProcessor] Duration extracted using ${method.name}: ${result.duration_seconds}s`);
        return result;
      }
    } catch (error) {
      console.log(`[VideoProcessor] ${method.name} method failed:`, error.error || error.message);
      continue;
    }
  }

  // All methods failed
  return {
    success: false,
    error: 'Could not extract video duration. Please ensure the video file is valid.',
    tried_methods: methods.map(m => m.name)
  };
}


// ─── Utility Functions ────────────────────────────────────────────────────

/**
 * Format duration in seconds to human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "2m 30s" or "1h 5m 20s")
 */
function formatDuration(seconds) {
  seconds = Math.round(seconds);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  
  return `${minutes}m ${secs}s`;
}

/**
 * Validate video file for upload
 * @param {string} videoPath - Path to video file
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateVideoFile(videoPath, options = {}) {
  const {
    maxSizeBytes = MAX_VIDEO_FILE_SIZE_BYTES,
    allowedFormats = SUPPORTED_VIDEO_FORMATS
  } = options;

  // Check file exists
  if (!fs.existsSync(videoPath)) {
    return {
      valid: false,
      error: 'File not found'
    };
  }

  // Check file extension
  const ext = path.extname(videoPath).toLowerCase();
  if (!allowedFormats.includes(ext)) {
    return {
      valid: false,
      error: `Invalid file format. Allowed: ${allowedFormats.join(', ')}`
    };
  }

  // Check file size
  const stats = fs.statSync(videoPath);
  if (stats.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum: ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB`
    };
  }

  if (stats.size === 0) {
    return {
      valid: false,
      error: 'File is empty'
    };
  }

  return {
    valid: true,
    size_bytes: stats.size,
    size_mb: (stats.size / (1024 * 1024)).toFixed(2),
    format: ext
  };
}


// ─── Export Module ────────────────────────────────────────────────────────

module.exports = {
  // Main extraction function
  extractVideoDuration,
  
  // Individual extraction methods (for testing)
  extractDurationWithFFProbe,
  extractDurationWithFluentFFmpeg,
  extractDurationFromMP4Header,
  
  // Validation
  validateVideoFile,
  
  // Utilities
  formatDuration,
  
  // Constants
  SUPPORTED_VIDEO_FORMATS,
  MAX_VIDEO_FILE_SIZE_BYTES,
  FFPROBE_PATH
};
