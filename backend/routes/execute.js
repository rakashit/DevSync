const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// Ensure temp directory exists
const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

router.post('/', verifyToken, (req, res) => {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  // Generate a random filename to avoid collisions
  const fileId = crypto.randomBytes(8).toString('hex');
  let ext = '';
  let command = '';

  if (language === 'javascript' || language === 'typescript') {
    ext = 'js';
    command = 'node';
  } else if (language === 'python') {
    ext = 'py';
    command = 'python'; // or python3 depending on system, but python is safer on Windows
  } else {
    return res.status(400).json({ error: `Execution not supported for language: ${language}` });
  }

  const filePath = path.join(tempDir, `${fileId}.${ext}`);

  // Write code to temp file
  fs.writeFile(filePath, code, (err) => {
    if (err) {
      console.error('Failed to write temp file:', err);
      return res.status(500).json({ error: 'Failed to prepare execution environment' });
    }

    // Execute the file with a timeout of 5 seconds to prevent infinite loops
    exec(`${command} "${filePath}"`, { timeout: 5000 }, (error, stdout, stderr) => {
      // Clean up the file
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete temp file:', unlinkErr);
      });

      if (error) {
        if (error.killed) {
          return res.status(200).json({ output: stderr || stdout || '', error: 'Execution Timeout (5000ms limit exceeded)' });
        }
        return res.status(200).json({ output: stdout, error: stderr || error.message });
      }

      res.status(200).json({ output: stdout, error: stderr });
    });
  });
});

module.exports = router;
