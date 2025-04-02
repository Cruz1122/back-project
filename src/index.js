const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const connectionDB = require("./config/database");
const routes = require("./routes/routes");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3005;

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Permitir todas las solicitudes de origen
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Métodos permitidos
    allowedHeaders: ["Content-Type", "Authorization"], // Encabezados permitidos
  })
); // Habilitar CORS para todas las rutas

app.options("*", cors()); // Permitir preflight requests para todas las rutas

// listen: 2 param puerto y función flecha
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.use(bodyParser.json());
app.use('/api/v1', routes);

module.exports = connectionDB();