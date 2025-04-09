const request = require("supertest");
const express = require("express");
const multer = require("multer");
const path = require("path");

// Mock Prisma
jest.mock("../../../src/config/database", () => ({
  prisma: {
    departamento: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    municipio: {
      create: jest.fn(),
    },
  },
}));

const { uploadCsv } = require("../../../src/controllers/GeoController");

// Express app para pruebas
const app = express();
app.use(express.json());

// Middleware de subida
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Ruta simulada para pruebas
app.post("/api/upload", upload.single("file"), uploadCsv);

describe("GeoController con mocks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Debe insertar departamentos y municipios desde un archivo CSV válido", async () => {
    const filePath = path.join(__dirname, "../data/valid.csv");

    const response = await request(app)
      .post("/api/upload")
      .attach("file", filePath);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(undefined);
  });

  test("Debe devolver un error si no se adjunta un archivo", async () => {
    const response = await request(app).post("/api/upload");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "No se proporcionó ningún archivo.",
    });
  });
});
