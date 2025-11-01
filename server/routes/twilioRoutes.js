const express = require('express');
const router = express.Router();
const twilioController = require('../controllers/twilioController');

router.post('/token', twilioController.generateToken);

module.exports = router;
