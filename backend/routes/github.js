const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/import-pr', verifyToken, async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'GitHub PR URL is required' });
    }

    // Match https://github.com/owner/repo/pull/123
    const regex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/;
    const match = url.match(regex);
    
    if (!match) {
      return res.status(400).json({ error: 'Invalid GitHub PR URL format' });
    }

    const [, owner, repo, pullNumber] = match;

    // Fetch PR files from GitHub API
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DevSync-App'
      }
    });

    if (!response.ok) {
      return res.status(400).json({ error: 'Failed to fetch PR from GitHub. The repo might be private or the PR does not exist.' });
    }

    const filesData = await response.json();
    
    // Download raw contents for each modified/added file
    const files = {};
    
    // Limit to 10 files to prevent rate limiting / overload for now
    const filesToFetch = filesData.slice(0, 10);
    
    for (const file of filesToFetch) {
      if (file.status === 'removed') continue;
      if (!file.raw_url) continue;

      try {
        const rawResponse = await fetch(file.raw_url);
        if (rawResponse.ok) {
          const content = await rawResponse.text();
          files[file.filename] = content;
        }
      } catch (err) {
        console.error(`Failed to fetch raw file: ${file.filename}`, err);
      }
    }

    res.status(200).json({ files });
  } catch (error) {
    console.error('Error importing GitHub PR:', error);
    res.status(500).json({ error: 'Internal server error while importing PR' });
  }
});

module.exports = router;
