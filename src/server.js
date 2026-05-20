import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const seedProducts = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-products.json'), 'utf8'));

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_cambiar_en_produccion';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '';

if (!ADMIN_PASS) {
  throw new Error('Falta ADMIN_PASS. Definí una contraseña segura en Render o en .env antes de iniciar.');
}
const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'product-images';

if (!DATABASE_URL) {
  console.warn('Falta DATABASE_URL. Configurala en .env o en Render.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

const query = (text, params = []) => pool.query(text, params);

function parseImages(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price || 1),
    description: row.description || '',
    images: parseImages(row.images),
    visible: Boolean(row.visible),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function cleanProductInput(body) {
  const allowedCategories = ['estimuladores', 'fetish', 'juegos', 'lenceria'];
  let images = body.images;
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch {
      images = images.split('\n').map(x => x.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(images)) images = [];
  images = images.map(x => String(x || '').trim()).filter(Boolean);

  return {
    name: String(body.name || '').trim(),
    category: allowedCategories.includes(body.category) ? body.category : 'estimuladores',
    price: Number(body.price) || 1,
    description: String(body.description || '').trim(),
    images: images.length ? images : [],
    visible: body.visible === true || body.visible === 'true' || body.visible === 1 || body.visible === '1'
  };
}

async function initDb() {
  await query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await query(`CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('estimuladores', 'fetish', 'juegos', 'lenceria')),
    price NUMERIC(12,2) NOT NULL DEFAULT 1,
    description TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  await query('CREATE INDEX IF NOT EXISTS idx_products_visible ON products(visible)');
  await query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)');

  const existingUser = await query('SELECT id, password_hash FROM users WHERE username = $1', [ADMIN_USER]);
  const hash = await bcrypt.hash(ADMIN_PASS, 10);
  if (existingUser.rowCount === 0) {
    await query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [ADMIN_USER, hash]);
  } else {
    const passwordMatchesEnv = await bcrypt.compare(ADMIN_PASS, existingUser.rows[0].password_hash);
    if (!passwordMatchesEnv) {
      await query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, ADMIN_USER]);
    }
  }

  const count = await query('SELECT COUNT(*)::int AS total FROM products');
  if (Number(count.rows[0]?.total || 0) === 0) {
    for (const product of seedProducts) {
      const clean = cleanProductInput({ ...product, visible: true });
      await query(
        `INSERT INTO products (name, category, price, description, images, visible)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [clean.name, clean.category, clean.price, clean.description, JSON.stringify(clean.images), clean.visible]
      );
    }
  }
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o vencido' });
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 }
});

function safeFileName(originalName) {
  const safeOriginal = String(originalName || 'image')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginal}`;
}

async function uploadToSupabaseStorage(file) {
  if (!supabase) {
    throw new Error('Supabase Storage no está configurado. Revisá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
  }

  const filePath = `products/${safeFileName(file.originalname)}`;
  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw new Error(`No se pudo subir imagen: ${error.message}`);

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (_req, res) => res.json({ ok: true, storage: Boolean(supabase), db: Boolean(DATABASE_URL) }));

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/products', async (req, res, next) => {
  try {
    const includeHidden = req.query.all === '1';
    const result = await query(
      `SELECT * FROM products ${includeHidden ? '' : 'WHERE visible = TRUE'} ORDER BY id DESC`
    );
    res.json(result.rows.map(mapProduct));
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', authRequired, async (req, res, next) => {
  try {
    const clean = cleanProductInput(req.body);
    if (!clean.name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const result = await query(
      `INSERT INTO products (name, category, price, description, images, visible)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       RETURNING *`,
      [clean.name, clean.category, clean.price, clean.description, JSON.stringify(clean.images), clean.visible]
    );
    res.status(201).json(mapProduct(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.put('/api/products/:id', authRequired, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const exists = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (exists.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    const clean = cleanProductInput(req.body);
    if (!clean.name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const result = await query(
      `UPDATE products
       SET name=$1, category=$2, price=$3, description=$4, images=$5::jsonb, visible=$6, updated_at=NOW()
       WHERE id=$7
       RETURNING *`,
      [clean.name, clean.category, clean.price, clean.description, JSON.stringify(clean.images), clean.visible, id]
    );
    res.json(mapProduct(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/products/:id', authRequired, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/products/reset', authRequired, async (_req, res, next) => {
  try {
    await query('DELETE FROM products');
    for (const product of seedProducts) {
      const clean = cleanProductInput({ ...product, visible: true });
      await query(
        `INSERT INTO products (name, category, price, description, images, visible)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        [clean.name, clean.category, clean.price, clean.description, JSON.stringify(clean.images), clean.visible]
      );
    }
    const result = await query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows.map(mapProduct));
  } catch (error) {
    next(error);
  }
});

app.post('/api/uploads', authRequired, upload.array('images', 10), async (req, res, next) => {
  try {
    const files = [];
    for (const file of req.files || []) {
      files.push(await uploadToSupabaseStorage(file));
    }
    res.json({ files });
  } catch (error) {
    next(error);
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

try {
  await initDb();
  app.listen(PORT, () => {
    console.log(`FM Florencia Marcon corriendo en http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('No se pudo iniciar la aplicación:', error);
  process.exit(1);
}
