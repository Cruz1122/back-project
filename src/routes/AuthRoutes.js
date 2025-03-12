const express = require('express');
const router = express.Router();
const {singIn, singUp} = require('../controllers/AuthController');

router.post('/singup', singUp);
router.post('/singin', singIn);

module.exports = router;