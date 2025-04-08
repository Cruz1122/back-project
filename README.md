# Back Project

Este es el backend del proyecto desarrollado para la materia de Software III.

## Tecnologías

- Node.js
- Prisma
- Docker
- Express

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/Cruz1122/back-project.git
cd back-project
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura el archivo `.env` a partir de `.env.example`.

4. Corre las migraciones de Prisma:

```bash
npx prisma migrate dev
```

5. Inicia el servidor:

```bash
npm run dev
```

## Uso con Docker

```bash
docker-compose up
```

## Estructura del proyecto

- `src/` - Código fuente de la aplicación.
- `prisma/` - Configuración y migraciones de la base de datos.
- `__tests__/` - Pruebas unitarias.

## Licencia

MIT
