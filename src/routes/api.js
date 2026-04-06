const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
    res.json({
        api: 'active',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

router.get('/version', (req, res) => {
    res.json({
        version: process.env.APP_VERSION || '1.0.0',
        build: process.env.BUILD_NUMBER || 'local',
        branch: process.env.GIT_BRANCH || 'main'
    });
});

module.exports = router;