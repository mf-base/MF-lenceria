let monedaActual = 'ARS';
// Swiper para el banner
new Swiper('.home-swiper', {
  loop: true,
  effect: 'fade',
  speed: 1000,
  autoplay: { delay: 3000, disableOnInteraction: false }
});

// 🔥 CONFIG DOLAR
const DOLAR_BLUE = 1410;

function convertirADolar(precioARS) {
  if (precioARS <= 1) return 'Consultar';
  return (precioARS / DOLAR_BLUE).toFixed(2);
}
function formatearPrecio(precioARS) {
  if (precioARS <= 1) return 'Consultar';

  if (monedaActual === 'USD') {
    return `USD $${(precioARS / DOLAR_BLUE).toFixed(2)}`;
  }

  return `ARS $${precioARS.toLocaleString('es-AR')}`;
}
const baseProducts = [];

let products = [];

function normalizeProducts(list) {
  return Array.isArray(list) ? list.filter(Boolean).map((product, index) => ({
    id: product.id || `producto_${index}_${Date.now()}`,
    name: String(product.name || '').trim(),
    category: ['estimuladores', 'fetish', 'juegos', 'lenceria'].includes(product.category) ? product.category : 'estimuladores',
    price: Number(product.price) || 1,
    description: String(product.description || '').trim(),
    images: Array.isArray(product.images) && product.images.length ? product.images : [],
    visible: product.visible !== false
  })).filter(product => product.name && product.visible) : [];
}

async function loadProductsFromApi() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('No se pudo leer el catálogo');
    products = normalizeProducts(await response.json());
  } catch (error) {
    console.warn('No se pudieron cargar productos desde la API. Se usa catálogo base.', error);
    products = normalizeProducts(baseProducts);
  }
}

async function initCatalog() {
  await loadProductsFromApi();
  renderProductsGrid();
  updateCartCount();
  renderCart();
}

function escapeAttr(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

document.addEventListener("DOMContentLoaded", () => {
  const currencyToggle = document.getElementById('currencyToggle');

  if (currencyToggle) {
    currencyToggle.addEventListener('change', () => {
      monedaActual = currencyToggle.checked ? 'USD' : 'ARS';
      renderProductsGrid();
      renderCart();
    });
  }
});

// Renderizado productos con swiper individual
function renderProductsGrid() {
  const categoryContainers = document.querySelectorAll('.catalog-category');
  categoryContainers.forEach(container => container.innerHTML = '');

  products.forEach((product, index) => {
    const container = document.getElementById(`cat-${product.category}`);
    if (!container) return;

    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-2 mb-4';
    const swiperId = `swiperProduct${index}`;
    const safeName = escapeAttr(product.name);
    const safeImages = (product.images || []).map(img => `<div class="swiper-slide"><img src="${escapeAttr(img)}" alt="${safeName}"></div>`).join('');

    col.innerHTML = `
      <div class="product-card">
        <div class="swiper ${swiperId}">
          <div class="swiper-wrapper">
            ${safeImages}
          </div>
        </div>
        <h5 class="mt-2">${safeName}</h5>
        <button class="btn btn-outline-pink w-100 mt-2" onclick="addProductToCartByIndex(${index})">
          <i class="fas fa-plus"></i> Añadir
        </button>
        <button class="btn btn-outline-light w-100 mt-2" onclick="openProductModal(${index})">Ver más</button>
      </div>
    `;
    container.appendChild(col);

    const swiper = new Swiper(`.${swiperId}`, {
      loop: true,
      effect: 'fade',
      speed: 600,
      autoplay: { delay: 500, disableOnInteraction: false }
    });

    const swiperEl = col.querySelector(`.${swiperId}`);
    swiperEl.addEventListener('mouseenter', () => swiper.autoplay.start());
    swiperEl.addEventListener('mouseleave', () => swiper.autoplay.stop());
  });
}

initCatalog();

function addProductToCartByIndex(index) {
  const product = products[index];
  if (!product) return;
  addToCart(product.name, 1);
  renderCart();
}

// Modal producto
let modalSlideshowInterval;
function openProductModal(index) {
  const product = products[index];
  document.getElementById('productModalLabel').textContent = product.name;
  document.getElementById('productModalDescription').textContent = product.description;

  document.getElementById('productModalPrice').textContent =
  formatearPrecio(product.price);

  const modalImage = document.getElementById('productModalImage');

  const buyBtn = document.getElementById('productModalBuyBtn');
  buyBtn.onclick = () => window.location.href =
    `https://wa.me/5491168240340?text=Quiero comprar ${encodeURIComponent(product.name)}`;

let currentImage = 0;

if (product.images && product.images.length > 0) {
  modalImage.src = product.images[currentImage];
} else {
  modalImage.src = ''; // o imagen placeholder si querés
}
modalImage.alt = product.name;
  if (modalSlideshowInterval) clearInterval(modalSlideshowInterval);
  if (product.images && product.images.length > 1) {
    modalSlideshowInterval = setInterval(() => {
      currentImage = (currentImage + 1) % product.images.length;
      modalImage.src = product.images[currentImage];
    }, 2000);
  }

  const myModal = new bootstrap.Modal(document.getElementById('productModal'));
  myModal.show();

  document.getElementById('productModal').addEventListener('hidden.bs.modal', () => clearInterval(modalSlideshowInterval), { once: true });
}

// Mostrar catálogo por categoría
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const category = btn.getAttribute('data-category');
    document.querySelectorAll('.catalog-category').forEach(div => div.style.display = 'none');
    document.getElementById(`cat-${category}`).style.display = 'flex';
  });
});

function addToCart(productName, quantity = 1) {
  const cart = JSON.parse(localStorage.getItem('cart')) || {};
  cart[productName] = (cart[productName] || 0) + quantity;
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  updateCartCount(); // ⬅️ agregamos esto
}


function removeFromCart(productName) {
  const cart = JSON.parse(localStorage.getItem('cart')) || {};
  if (cart[productName]) {
    cart[productName]--;
    if (cart[productName] <= 0) delete cart[productName];
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    updateCartCount(); // ⬅️ agregar
  }
}

function deleteFromCart(productName) {
  const cart = JSON.parse(localStorage.getItem('cart')) || {};
  delete cart[productName];
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  updateCartCount(); // ⬅️ agregar
}



function renderCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || {};
  const cartItems = document.getElementById('cart-items');
  cartItems.innerHTML = '';

  let sumPrice = 0;

  for (const [name, quantity] of Object.entries(cart)) {
    const product = products.find(p => p.name === name);
    const price = product?.price || 0;

    let subtotalTexto = '';
let subtotalNumerico = 0;

if (price <= 1) {
  subtotalTexto = 'Consultar';
} else if (monedaActual === 'USD') {
  subtotalNumerico = (price * quantity) / DOLAR_BLUE;
  subtotalTexto = `USD $${subtotalNumerico.toFixed(2)}`;
  sumPrice += subtotalNumerico;
} else {
  subtotalNumerico = price * quantity;
  subtotalTexto = `ARS $${subtotalNumerico.toLocaleString('es-AR')}`;
  sumPrice += subtotalNumerico;
}

    const li = document.createElement('li');
    li.className = 'list-group-item bg-dark d-flex justify-content-between align-items-center';

    li.innerHTML = `
      <span>${name} × ${quantity} — ${subtotalTexto}</span>
      <div>
        <button class="btn btn-sm btn-outline-light me-1" onclick="addToCart('${name}')">+</button>
        <button class="btn btn-sm btn-outline-light me-1" onclick="removeFromCart('${name}')">−</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteFromCart('${name}')">x</button>
      </div>
    `;

    cartItems.appendChild(li);
  }

  document.getElementById('cart-total').textContent =
  monedaActual === 'USD'
    ? `USD $${sumPrice.toFixed(2)}`
    : `ARS $${sumPrice.toLocaleString('es-AR')}`;
}

function sendCartToWhatsApp() {
  const cart = JSON.parse(localStorage.getItem('cart')) || {};
  if (Object.keys(cart).length === 0) return alert('Tu carrito está vacío');

  let message = 'Hola! Quiero comprar los siguientes productos:\n\n';
  let sum = 0;

  for (const [name, quantity] of Object.entries(cart)) {
    const product = products.find(p => p.name === name);
    const price = product?.price || 0;

   let subtotalTexto = '';

if (price <= 1) {
  subtotalTexto = 'Consultar';
} else if (monedaActual === 'USD') {
  const subtotalUSD = (price * quantity) / DOLAR_BLUE;
  subtotalTexto = `USD $${subtotalUSD.toFixed(2)}`;
  sum += subtotalUSD;
} else {
  const subtotalARS = price * quantity;
  subtotalTexto = `ARS $${subtotalARS.toLocaleString('es-AR')}`;
  sum += subtotalARS;
}

message += `• ${name} x${quantity} - ${subtotalTexto}\n`;
  }

 message += `\nTotal: ${
  monedaActual === 'USD'
    ? `USD $${sum.toFixed(2)}`
    : `ARS $${sum.toLocaleString('es-AR')}`
}`;

  const url = `https://wa.me/5491168240340?text=${encodeURIComponent(message)}`;
  localStorage.removeItem('cart');
  window.location.href = url;
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || {};
  let totalItems = 0;
  for (const productName in cart) {
    const quantity = typeof cart[productName] === 'object' ? cart[productName].quantity : cart[productName];
    totalItems += quantity;
  }
  const cartCountElement = document.getElementById('cartCount');
  if (cartCountElement) {
    cartCountElement.textContent = totalItems;
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderCart();
});

document.getElementById('searchInput').addEventListener('input', function () {
  const term = this.value.toLowerCase();
  let visibleCount = 0;

  document.querySelectorAll('.product-card').forEach(card => {
    const name = card.querySelector('h5')?.textContent.toLowerCase();
    const isVisible = name.includes(term);
    card.style.display = isVisible ? 'block' : 'none';
    if (isVisible) visibleCount++;
  });

  const noResultsMsg = document.getElementById('noResultsMsg');
  if (noResultsMsg) noResultsMsg.style.display = visibleCount === 0 ? 'block' : 'none';
});





window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;       // cuánto bajó el scroll
  const height = document.body.scrollHeight - window.innerHeight;  // total scroll posible
  const scrollPercent = scrollY / height;

  if (scrollPercent < 0.25) {
    document.body.style.backgroundColor = '#000000';  // Primer tramo
  } else if (scrollPercent < 0.5) {
    document.body.style.backgroundColor = '#6B1524';  // Segundo tramo
  } else if (scrollPercent < 0.75) {
    document.body.style.backgroundColor = '#930022';  // Tercer tramo (ejemplo)
  } else {
    document.body.style.backgroundColor = '#441120';  // Último tramo
  }
});


