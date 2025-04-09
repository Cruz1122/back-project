const express = require('express');
const router = express.Router();

const authRoutes = require('./AuthRoutes');
const userRoutes = require('./UserRoutes');
const geoRoutes = require('./GeoRoutes'); // ✅ ahora sí es un router válido

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/geo', geoRoutes);

module.exports = router;
