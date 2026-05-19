# Deploy gratuito: Render + Supabase

Este ZIP ya contiene frontend + backend en el mismo proyecto.

- Render corre el backend Node/Express y sirve el frontend.
- Supabase guarda la base PostgreSQL y las imágenes del catálogo.
- No usa SQLite, así no perdés datos cuando Render reinicia.

---

## 1) Crear cuenta en Supabase

1. Entrá a https://supabase.com
2. Creá una cuenta gratis.
3. Tocá **New project**.
4. Elegí nombre, por ejemplo: `fm-florencia-marcon`.
5. Guardá la contraseña de la base.
6. Esperá a que el proyecto termine de crearse.

---

## 2) Crear tablas en Supabase

1. Entrá a tu proyecto de Supabase.
2. Andá a **SQL Editor**.
3. Tocá **New query**.
4. Pegá el contenido del archivo `schema.sql`.
5. Tocá **Run**.

El backend también crea las tablas automáticamente al iniciar, pero ejecutar `schema.sql` sirve para validar que la base está bien.

---

## 3) Crear bucket para imágenes

1. En Supabase, andá a **Storage**.
2. Tocá **New bucket**.
3. Nombre del bucket:

```txt
product-images
```

4. Marcá el bucket como **Public**.
5. Guardá.

Importante: si el bucket no es público, las imágenes pueden subirse pero no verse en la tienda.

---

## 4) Copiar variables de Supabase

Necesitás estos datos:

### DATABASE_URL

En Supabase:

```txt
Project Settings > Database > Connection string > URI
```

Copiá la URI. Se ve parecida a esto:

```txt
postgresql://postgres.xxxxx:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

Reemplazá `TU_PASSWORD` por la contraseña real de tu base.

### SUPABASE_URL

En Supabase:

```txt
Project Settings > API > Project URL
```

### SUPABASE_SERVICE_ROLE_KEY

En Supabase:

```txt
Project Settings > API > service_role key
```

Usá la `service_role`, no la `anon public`.

---

## 5) Subir proyecto a GitHub

Render trabaja muy fácil desde GitHub.

1. Descomprimí este ZIP en tu PC.
2. Abrí la carpeta en VS Code.
3. Creá un repositorio en GitHub.
4. Subí los archivos.

Comandos de ejemplo:

```bash
git init
git add .
git commit -m "Deploy Render Supabase"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

---

## 6) Crear Web Service en Render

1. Entrá a https://render.com
2. Creá cuenta gratis.
3. Tocá **New +**.
4. Elegí **Web Service**.
5. Conectá tu GitHub.
6. Elegí el repositorio del proyecto.

Configuración:

```txt
Name: fm-florencia-marcon
Environment: Node
Region: cualquiera disponible
Branch: main
Build Command: npm install
Start Command: npm start
Plan: Free
```

---

## 7) Cargar variables en Render

En Render, dentro del Web Service:

```txt
Environment > Add Environment Variable
```

Agregá:

```txt
NODE_ENV=production
JWT_SECRET=poné_una_clave_larga_y_random
ADMIN_USER=admin
ADMIN_PASS=poné_una_contraseña_segura
DATABASE_URL=tu_connection_string_de_supabase
SUPABASE_URL=tu_project_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_BUCKET=product-images
```

Recomendación: cambiá `ADMIN_PASS` por una contraseña real antes del primer deploy.

---

## 8) Deploy

1. Tocá **Deploy latest commit**.
2. Esperá que termine.
3. Render te va a dar una URL parecida a:

```txt
https://fm-florencia-marcon.onrender.com
```

Tienda:

```txt
https://fm-florencia-marcon.onrender.com
```

Admin:

```txt
https://fm-florencia-marcon.onrender.com/admin.html
```

Login inicial:

```txt
Usuario: admin
Contraseña: la que pusiste en ADMIN_PASS
```

---

## 9) Verificación rápida

Probá estas URLs:

```txt
/api/health
/api/products
/admin.html
```

Si `/api/health` devuelve `ok: true`, el backend está vivo.

---

## 10) Notas importantes

Render Free puede dormir la app cuando nadie la usa. La primera carga después de dormir puede tardar un poco.

Supabase Free es suficiente para una tienda chica. Si el catálogo crece mucho o subís muchas imágenes pesadas, conviene optimizarlas antes de subirlas.

Las imágenes nuevas se guardan en Supabase Storage. Las imágenes originales del diseño siguen dentro de `/public/assets`.

---

## Errores comunes

### Error de conexión a la base

Revisá `DATABASE_URL`, especialmente que la contraseña esté puesta y no quede `TU_PASSWORD`.

### Login no funciona

Si ya se creó el usuario admin antes, cambiar `ADMIN_PASS` después no cambia la contraseña existente. Para resetearla, borrá la fila del usuario en Supabase o cambiá el password_hash manualmente.

### Imágenes no se ven

Revisá que el bucket `product-images` sea público.

### Upload falla

Revisá que estés usando `SUPABASE_SERVICE_ROLE_KEY`, no la key pública.
