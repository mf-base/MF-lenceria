-- 1) Agrega la columna subcategory si todavía no existe.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT '';

-- 2) Normaliza categorías viejas del catálogo.
UPDATE products
SET category = 'lenceria'
WHERE category = 'lenceria & lubricantes';

UPDATE products
SET category = 'fetish'
WHERE category IN ('Fetish & Sado', 'sado & fetish');

-- 3) Limpia subcategorías anteriores de productos de lencería.
UPDATE products
SET subcategory = ''
WHERE category = 'lenceria';

-- 4) Perfumes / aromáticos.
UPDATE products
SET subcategory = 'perfumes'
WHERE category = 'lenceria'
  AND (
    name ILIKE '%perfume%'
    OR name ILIKE '%afrodisíaco%'
    OR name ILIKE '%afrodisiaco%'
    OR name ILIKE '%body splash%'
    OR name ILIKE '%for him%'
    OR name ILIKE '%it femme%'
  );

-- 5) Lubricantes / aceites / geles / velas.
UPDATE products
SET subcategory = 'lubricantes'
WHERE category = 'lenceria'
  AND (
    name ILIKE '%lubricante%'
    OR name ILIKE '%gel%'
    OR name ILIKE '%aceite%'
    OR name ILIKE '%óleo%'
    OR name ILIKE '%oleo%'
    OR name ILIKE '%miss v%'
    OR name ILIKE '%more sex%'
    OR name ILIKE '%bitchie%'
    OR name ILIKE '%divas secret%'
    OR name ILIKE '%sexitive%'
    OR name ILIKE '%sextual%'
    OR name ILIKE '%vela%'
  );

-- 6) Vigorizantes.
UPDATE products
SET subcategory = 'vigorizantes'
WHERE category = 'lenceria'
  AND (
    name ILIKE '%vigorisante%'
    OR name ILIKE '%sexy drops%'
    OR name ILIKE '%drops%'
    OR name ILIKE '%vital honey%'
    OR name ILIKE '%honey%'
  );

-- 7) El resto de la categoría lencería queda como subcategoría lencería.
UPDATE products
SET subcategory = 'lenceria'
WHERE category = 'lenceria'
  AND COALESCE(subcategory, '') = '';

-- 8) Control final.
SELECT category, subcategory, COUNT(*) AS cantidad
FROM products
GROUP BY category, subcategory
ORDER BY category, subcategory;
