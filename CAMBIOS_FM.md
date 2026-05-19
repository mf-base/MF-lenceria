# Cambios realizados para FM Florencia Marcon

- Marca cambiada de DR / Daiana Riera a FM / Florencia Marcon.
- Se mantuvo la interfaz y los colores principales.
- Catálogo inicial vaciado: `src/seed-products.json` queda vacío y el frontend no carga productos locales de respaldo.
- Popup de muñecos eliminado del HTML, JS y CSS.
- Banner principal reemplazado por las imágenes PNG subidas: `fm-banner-1.png` y `fm-banner-2.png`.
- Los archivos HEIC fueron copiados a `public/assets`, pero no se usan en el banner porque muchos navegadores no los muestran correctamente. Conviene convertirlos a PNG/JPG si querés sumarlos al slider.

## Importante sobre base de datos

Para que el catálogo aparezca vacío en producción, usá una base Supabase nueva para este segundo proyecto o vaciá la tabla `products` en la base asignada a FM. Si reutilizás la misma base del proyecto DR, van a seguir apareciendo los productos anteriores porque ya están guardados en la DB.
