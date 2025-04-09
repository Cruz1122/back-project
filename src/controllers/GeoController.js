const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
console.log("📦 Modelos disponibles en Prisma:", Object.keys(prisma));
let Contador = 0;

const uploadCsv = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ error: "No se proporcionó ningún archivo." });
    }

    if (path.extname(file.originalname).toLowerCase() !== ".csv") {
      return res.status(400).json({ error: "Solo se permiten archivos CSV." });
    }

    const results = [];
    const filePath = path.join(__dirname, "../../upload", file.filename);

    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.toLowerCase().trim(),
        })
      )
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        // Limpieza de datos
        const cleanedData = results
          .map((row) => ({
            departamento: row.departamento?.trim(),
            municipio: row.municipio?.trim(),
          }))
          .filter((row) => row.departamento && row.municipio);

        // Extraer nombres únicos de departamentos
        const nombresDepartamentos = [
          ...new Set(cleanedData.map((r) => r.departamento)),
        ];

        // Buscar departamentos existentes
        const departamentosExistentes = await prisma.departamento.findMany({
          where: {
            nombre: { in: nombresDepartamentos },
          },
        });

        const mapaDepartamentos = new Map(
          departamentosExistentes.map((dep) => [dep.nombre, dep])
        );

        // Crear los departamentos que faltan
        const departamentosFaltantes = nombresDepartamentos.filter(
          (nombre) => !mapaDepartamentos.has(nombre)
        );

        const nuevosDepartamentos = await Promise.all(
          departamentosFaltantes.map((nombre) =>
            prisma.departamento.create({ data: { nombre } })
          )
        );

        // Actualizar el mapa con los nuevos departamentos
        nuevosDepartamentos.forEach((dep) => {
          mapaDepartamentos.set(dep.nombre, dep);
        });

        // Agrupar municipios por nombre y departamentoId
        const municipiosMap = new Map();

        for (const { municipio, departamento } of cleanedData) {
          Contador++;
          console.log(`Contador: ${Contador}`);
          
          const departamentoId = mapaDepartamentos.get(departamento)?.id;
          if (departamentoId) {
            const key = `${municipio}-${departamentoId}`;
            municipiosMap.set(key, { nombre: municipio, departamentoId });
          }
        }

        // Buscar municipios existentes
        const municipiosExistentes = await prisma.municipio.findMany({
          where: {
            OR: Array.from(municipiosMap.values()).map((m) => ({
              nombre: m.nombre,
              departamentoId: m.departamentoId,
            })),
          },
        });

        const municipiosExistentesKeys = new Set(
          municipiosExistentes.map(
            (m) => `${m.nombre}-${m.departamentoId}`
          )
        );

        // Filtrar solo los municipios nuevos
        const municipiosNuevos = Array.from(municipiosMap.entries())
          .filter(([key]) => !municipiosExistentesKeys.has(key))
          .map(([_, data]) => data);

        // Insertar nuevos municipios
        const creados = await Promise.all(
          municipiosNuevos.map((m) =>
            prisma.municipio.create({ data: m })
          )
        );

        res.status(200).json({
          mensaje: "CSV procesado correctamente.",
          departamentosCreados: nuevosDepartamentos.length,
          municipiosCreados: creados.length,
        });
      });
  } catch (error) {
    console.error("Error al procesar el CSV:", error);
    res.status(500).json({ error: "Error al procesar el archivo CSV." });
  }
};

const getMunicipiosConDepartamento = async (req, res) => {
  try {
    const municipios = await prisma.municipio.findMany({
      include: {
        departamento: true,
      },
      orderBy: {
        departamento: {
          nombre: "asc",
        },
      },
    });

    res.status(200).json({ municipios });
  } catch (error) {
    console.error("Error al obtener municipios:", error);
    res.status(500).json({ error: "Error al obtener los municipios." });
  }
};


module.exports = {
  uploadCsv,
  getMunicipiosConDepartamento,
};