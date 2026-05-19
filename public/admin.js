const API_BASE = '';
const TOKEN_KEY = 'fm_admin_token';
let products = [];

const els = {};
function $(id) { return document.getElementById(id); }

function money(value) {
  const number = Number(value || 0);
  return number <= 1 ? 'Consultar' : `ARS $${number.toLocaleString('es-AR')}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function token() { return localStorage.getItem(TOKEN_KEY); }
function authHeaders() { return { Authorization: `Bearer ${token()}` }; }

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Error de servidor');
  return data;
}

function showMessage(text, type = 'success') {
  els.adminMessage.className = `alert alert-${type}`;
  els.adminMessage.textContent = text;
  els.adminMessage.style.display = 'block';
  setTimeout(() => { els.adminMessage.style.display = 'none'; }, 3500);
}

function setScreen() {
  const logged = Boolean(token());
  els.loginBox.style.display = logged ? 'none' : 'block';
  els.adminPanel.style.display = logged ? 'block' : 'none';
  if (logged) loadProducts();
}

function normalizeImageUrl(url) {
  const clean = String(url || '').trim();
  if (!clean) return '';
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:')) return clean;
  if (clean.startsWith('/uploads/')) return clean;
  return clean;
}

function productFromForm(extraImages = []) {
  const typedImages = els.imageUrls.value.split('\n').map(normalizeImageUrl).filter(Boolean);
  return {
    name: els.name.value.trim(),
    category: els.category.value,
    price: Number(els.price.value) || 1,
    description: els.description.value.trim(),
    images: [...typedImages, ...extraImages],
    visible: els.visible.checked
  };
}

function fillForm(product) {
  els.productId.value = product.id;
  els.name.value = product.name || '';
  els.category.value = product.category || 'estimuladores';
  els.price.value = product.price || 1;
  els.description.value = product.description || '';
  els.imageUrls.value = (product.images || []).join('\n');
  els.visible.checked = product.visible !== false;
  els.formTitle.textContent = `Editar: ${product.name}`;
  renderCurrentImages(product.images || []);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearForm() {
  els.productForm.reset();
  els.productId.value = '';
  els.price.value = 1;
  els.visible.checked = true;
  els.imageUrls.value = '';
  els.imageFiles.value = '';
  els.formTitle.textContent = 'Producto';
  renderCurrentImages([]);
}

function renderCurrentImages(images) {
  els.currentImages.innerHTML = (images || []).map(src => `
    <span class="preview-thumb"><img src="${escapeHtml(src)}" alt=""></span>
  `).join('');
}

function renderProductsTable() {
  const term = els.adminSearch.value.trim().toLowerCase();
  const filtered = products.filter(product =>
    product.name.toLowerCase().includes(term) ||
    product.category.toLowerCase().includes(term) ||
    String(product.description || '').toLowerCase().includes(term)
  );

  els.productsTableBody.innerHTML = filtered.map(product => {
    const image = product.images?.[0] || '';
    return `
      <tr>
        <td><img class="table-img" src="${escapeHtml(image)}" alt=""></td>
        <td>
          <strong>${escapeHtml(product.name)}</strong>
          <div class="small text-muted">ID ${product.id}</div>
        </td>
        <td>${escapeHtml(product.category)}</td>
        <td>${money(product.price)}</td>
        <td>
          <button class="btn btn-sm ${product.visible ? 'btn-success' : 'btn-secondary'}" onclick="toggleVisible(${product.id})">
            ${product.visible ? 'Visible' : 'Oculto'}
          </button>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-light me-1" onclick="editProduct(${product.id})">Editar</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${product.id})">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadProducts() {
  products = await api('/api/products?all=1');
  renderProductsTable();
}

async function uploadImages() {
  const files = Array.from(els.imageFiles.files || []);
  if (!files.length) return [];
  const formData = new FormData();
  files.forEach(file => formData.append('images', file));
  const result = await api('/api/uploads', {
    method: 'POST',
    headers: authHeaders(),
    body: formData
  });
  return result.files || [];
}

async function handleLogin(event) {
  event.preventDefault();
  els.loginError.style.display = 'none';
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: els.adminUser.value.trim(), password: els.adminPass.value })
    });
    localStorage.setItem(TOKEN_KEY, result.token);
    setScreen();
  } catch (error) {
    els.loginError.textContent = error.message;
    els.loginError.style.display = 'block';
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  try {
    const extraImages = await uploadImages();
    const product = productFromForm(extraImages);
    if (!product.name) return showMessage('El nombre del producto es obligatorio.', 'danger');
    const id = els.productId.value;
    if (id) {
      await api(`/api/products/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(product) });
      showMessage('Producto actualizado correctamente.', 'success');
    } else {
      await api('/api/products', { method: 'POST', headers: authHeaders(), body: JSON.stringify(product) });
      showMessage('Producto creado correctamente.', 'success');
    }
    clearForm();
    await loadProducts();
  } catch (error) {
    showMessage(error.message, 'danger');
  }
}

function editProduct(id) {
  const product = products.find(item => Number(item.id) === Number(id));
  if (product) fillForm(product);
}
window.editProduct = editProduct;

async function toggleVisible(id) {
  const product = products.find(item => Number(item.id) === Number(id));
  if (!product) return;
  try {
    await api(`/api/products/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ ...product, visible: !product.visible })
    });
    await loadProducts();
  } catch (error) {
    showMessage(error.message, 'danger');
  }
}
window.toggleVisible = toggleVisible;

async function deleteProduct(id) {
  const product = products.find(item => Number(item.id) === Number(id));
  if (!product || !confirm(`¿Eliminar "${product.name}"?`)) return;
  try {
    await api(`/api/products/${id}`, { method: 'DELETE', headers: authHeaders() });
    await loadProducts();
    showMessage('Producto eliminado.', 'success');
  } catch (error) {
    showMessage(error.message, 'danger');
  }
}
window.deleteProduct = deleteProduct;

function exportProducts() {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'productos-fm-florencia-marcon.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importProducts(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  showMessage('Importación JSON no automática: usá el formulario para cargar productos nuevos o restaurá el catálogo original.', 'warning');
  event.target.value = '';
}

async function resetToDefault() {
  if (!confirm('Esto borra el catálogo actual y restaura los productos originales. ¿Continuar?')) return;
  try {
    products = await api('/api/products/reset', { method: 'POST', headers: authHeaders() });
    renderProductsTable();
    clearForm();
    showMessage('Catálogo restaurado.', 'success');
  } catch (error) {
    showMessage(error.message, 'danger');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ['loginBox','adminPanel','loginForm','adminUser','adminPass','loginError','logoutBtn','productForm','productId','name','category','price','description','imageUrls','imageFiles','visible','formTitle','currentImages','productsTableBody','adminSearch','adminMessage','exportBtn','importFile','resetBtn','cancelBtn'].forEach(id => { els[id] = $(id); });

  els.loginForm.addEventListener('submit', handleLogin);
  els.logoutBtn.addEventListener('click', () => { localStorage.removeItem(TOKEN_KEY); setScreen(); });
  els.productForm.addEventListener('submit', handleSubmit);
  els.cancelBtn.addEventListener('click', clearForm);
  els.adminSearch.addEventListener('input', renderProductsTable);
  els.exportBtn.addEventListener('click', exportProducts);
  els.importFile.addEventListener('change', importProducts);
  els.resetBtn.addEventListener('click', resetToDefault);
  setScreen();
});
