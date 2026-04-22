import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// In-memory storage for test logs (in production, use a database)
const testLogs = [];
const LOG_FILE_PATH = path.join(__dirname, '..', '..', 'logs', 'device-tests.json');

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE_PATH);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Load existing logs from file
const loadLogs = () => {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const data = fs.readFileSync(LOG_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading device test logs:', error);
  }
  return [];
};

// Save logs to file
const saveLogs = (logs) => {
  try {
    fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error saving device test logs:', error);
  }
};

// POST /api/device-test/log - Save test result
router.post('/log', (req, res) => {
  try {
    const { camera, microphone, status, browser, userId } = req.body;

    // Validate required fields
    if (!status || !browser) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Status and browser are required fields'
      });
    }

    // Create test log entry
    const testLog = {
      id: Date.now().toString(),
      camera: camera || 'No camera detected',
      microphone: microphone || 'No microphone detected',
      status: status === 'success' ? 'success' : 'failure',
      browser,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    };

    // Add to logs array
    testLogs.push(testLog);

    // Save to file
    const allLogs = loadLogs();
    allLogs.push(testLog);
    saveLogs(allLogs);

    res.json({
      success: true,
      data: testLog,
      error: null
    });
  } catch (error) {
    console.error('Device test log error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// GET /api/device-test/log - Retrieve test logs (for admin/debugging)
router.get('/log', (req, res) => {
  try {
    const { limit = 50, userId } = req.query;
    const logs = loadLogs();
    
    let filteredLogs = logs;
    
    // Filter by user ID if provided
    if (userId && userId !== 'all') {
      filteredLogs = logs.filter(log => log.userId === userId);
    }
    
    // Sort by timestamp (newest first) and limit
    const sortedLogs = filteredLogs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        logs: sortedLogs,
        total: filteredLogs.length,
        showing: sortedLogs.length
      },
      error: null
    });
  } catch (error) {
    console.error('Device test log retrieval error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// GET /api/device-test/stats - Get test statistics
router.get('/stats', (req, res) => {
  try {
    const logs = loadLogs();
    
    const stats = {
      total: logs.length,
      successful: logs.filter(log => log.status === 'success').length,
      failed: logs.filter(log => log.status === 'failure').length,
      cameras: [...new Set(logs.map(log => log.camera))].filter(camera => camera !== 'No camera detected'),
      microphones: [...new Set(logs.map(log => log.microphone))].filter(mic => mic !== 'No microphone detected'),
      browsers: [...new Set(logs.map(log => log.browser))],
      lastTest: logs.length > 0 ? logs[logs.length - 1].timestamp : null
    };

    res.json({
      success: true,
      data: stats,
      error: null
    });
  } catch (error) {
    console.error('Device test stats error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// DELETE /api/device-test/log - Clear test logs (admin function)
router.delete('/log', (req, res) => {
  try {
    // Clear in-memory logs
    testLogs.length = 0;
    
    // Clear file logs
    saveLogs([]);
    
    res.json({
      success: true,
      data: { message: 'Test logs cleared successfully' },
      error: null
    });
  } catch (error) {
    console.error('Device test log deletion error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

export default router;
