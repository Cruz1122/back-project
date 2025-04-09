const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  uploadCsv,
  getMunicipiosConDepartamento, // nuevo controlador
} = require("../controllers/GeoController");

// Configuración de multer para almacenar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../upload");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// Ruta para cargar CSV
router.post("/upload-csv", upload.single("file"), uploadCsv);

// ✅ Nueva ruta para obtener municipios con su departamento
router.get("/municipios", getMunicipiosConDepartamento);

module.exports = router;
