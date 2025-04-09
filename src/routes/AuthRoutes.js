const express = require('express');
const router = express.Router();
const {
  signIn,
  signUp,
  verifyCode,
  resendVerificationCode,
  verifySmsLogin
} = require('../controllers/AuthController');

router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/verify', verifyCode);
router.post('/resend', resendVerificationCode);
router.post('/sms-verify', verifySmsLogin); // Este sí está definido

module.exports = router;
