# FM Florencia Marcon — Render + Supabase Ready

Versión preparada para deploy en un Render + Supabase.

Incluye:

- Frontend público servido desde Express.
- Panel admin en `/admin.html`.
- Backend Node.js + Express.
- Base de datos PostgreSQL en Supabase.
- Login admin con JWT.
- CRUD real de productos.
- Subida de imágenes a Supabase Storage.
- Configuración PM2: `ecosystem.config.cjs`.
- Ejemplo Nginx: `nginx.fm-florencia-marcon.conf.example`.
- Guía paso a paso: `DEPLOY_RENDER_SUPABASE.md`.

## Usuario inicial

```txt
Usuario: admin
Contraseña: la que definas en `ADMIN_PASS`
```

Cambiá esos datos en `.env` antes del primer arranque.

## Instalación local

```bash
npm install
cp .env.example .env
npm start
```

Abrir:

```txt
http://localhost:3000
http://localhost:3000/admin.html
```

## Deploy en DigitalOcean

Abrí el archivo:

```txt
DEPLOY_RENDER_SUPABASE.md
```

Ahí está el paso a paso completo para Ubuntu + Node + PM2 + Nginx + SSL.

## Variables de entorno

Producción:

```bash
cp .env.production.example .env
```

Contenido base:

```txt
NODE_ENV=production
PORT=3000
JWT_SECRET=CAMBIAR_POR_UNA_CLAVE_LARGA_DE_64_CARACTERES_MINIMO
ADMIN_USER=admin
ADMIN_PASS=CAMBIAR_ESTA_CONTRASENA
```

## Datos persistentes

No borrar nunca estas rutas en producción:

```txt
data/database.sqlite
public/uploads
.env
```

## Endpoints principales

```txt
POST   /api/auth/login
GET    /api/products
GET    /api/products?all=1
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
POST   /api/uploads
POST   /api/products/reset
```
