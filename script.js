/* ================================================================
   SHREE DATA — script.js
   100% JSONP — zero CORS errors, no fetch(), no doPost
   ================================================================ */

const API_URL = 'https://script.google.com/macros/s/AKfycbwKvCysMj_4EX2BfpCc38_JlppOdzgjsjCo_Nl0WyhMfKZcFr0XTnuwfojEb75cEM5m/exec'; // ← paste your NEW /exec URL here

// ================================================================
//  JSONP — injects <script> tag, bypasses CORS completely
// ================================================================
function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cbName = '_sd_' + Date.now() + '_' + Math.floor(Math.random() * 99999);
    const timer  = setTimeout(() => {
      delete window[cbName];
      document.getElementById(cbName)?.remove();
      reject(new Error('Request timed out — check API_URL in script.js'));
    }, 30000);

    window[cbName] = data => {
      clearTimeout(timer);
      delete window[cbName];
      document.getElementById(cbName)?.remove();
      resolve(data);
    };

    const qs = Object.entries({ ...params, callback: cbName })
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
      .join('&');

    const s   = document.createElement('script');
    s.id      = cbName;
    s.src     = API_URL + '?' + qs;
    s.onerror = () => {
      clearTimeout(timer);
      delete window[cbName];
      s.remove();
      reject(new Error('Script load failed — check API_URL in script.js'));
    };
    document.head.appendChild(s);
  });
}

// ================================================================
//  STATE
// ================================================================
let allProducts    = [];
let activeCategory = 'all';
let cart           = JSON.parse(localStorage.getItem('sdCart') || '[]');

// ================================================================
//  TOAST
// ================================================================
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
  t.className   = 'toast show' + (type === 'error' ? ' error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ================================================================
//  PASSWORD TOGGLE
// ================================================================
function togglePass(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type         = el.type === 'password' ? 'text' : 'password';
  btn.textContent = el.type === 'password' ? '👁' : '🙈';
}

// ================================================================
//  NAVBAR
// ================================================================
window.addEventListener('scroll', () => {
  document.getElementById('navbar')?.classList.toggle('scrolled', scrollY > 30);
  updateActiveNav();
});

function toggleMenu() {
  document.getElementById('navLinks')?.classList.toggle('open');
}

document.addEventListener('click', e => {
  const links  = document.getElementById('navLinks');
  const burger = document.getElementById('hamburger');
  if (links && burger && !links.contains(e.target) && !burger.contains(e.target))
    links.classList.remove('open');
});

function updateActiveNav() {
  const y = window.scrollY + 120;
  document.querySelectorAll('.nav-link').forEach(a => {
    const id  = (a.getAttribute('href') || '').replace('#', '');
    const sec = document.getElementById(id);
    if (sec) a.classList.toggle('active', y >= sec.offsetTop && y < sec.offsetTop + sec.offsetHeight);
  });
}

// ================================================================
//  USER SESSION
// ================================================================
function logoutUser() {
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  window.location.href = 'index.html';
}

// ================================================================
//  CART
// ================================================================
function saveCart() { localStorage.setItem('sdCart', JSON.stringify(cart)); }

function updateCartBadge() {
  const b = document.getElementById('cartBadge');
  if (!b) return;
  const n = cart.reduce((s, i) => s + i.qty, 0);
  b.textContent   = n;
  b.style.display = n ? 'flex' : 'none';
}

function toggleCart() {
  const drawer  = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer) return;
  const open = drawer.classList.toggle('open');
  overlay?.classList.toggle('show', open);
  if (open) renderCart();
}

function renderCart() {
  const itemsEl  = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');
  const emptyEl  = document.getElementById('cartEmpty');
  const totalEl  = document.getElementById('cartTotal');
  if (!itemsEl) return;

  if (!cart.length) {
    itemsEl.innerHTML = '';
    if (footerEl) footerEl.style.display = 'none';
    if (emptyEl)  emptyEl.style.display  = 'flex';
    return;
  }
  if (emptyEl)  emptyEl.style.display  = 'none';
  if (footerEl) footerEl.style.display = 'block';

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (totalEl) totalEl.textContent = '₹' + total.toFixed(0);

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}" onerror="this.outerHTML='<span style=font-size:2rem>🫒</span>'">`
          : '<span style="font-size:2rem">🫒</span>'}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price} × ${item.qty} = <strong>₹${(item.price * item.qty).toFixed(0)}</strong></div>
      </div>
      <div class="cart-item-controls">
        <button class="cart-qty-btn" onclick="changeQty('${item.id}',-1)">−</button>
        <span class="cart-qty">${item.qty}</span>
        <button class="cart-qty-btn" onclick="changeQty('${item.id}',1)">+</button>
      </div>
    </div>`).join('');
}

function addToCart(id, name, price, image) {
  const ex = cart.find(i => i.id === id);
  if (ex) ex.qty++;
  else cart.push({ id, name, price: parseFloat(price), image, qty: 1 });
  saveCart();
  updateCartBadge();
  showToast(name + ' added to cart!');
}

function changeQty(id, delta) {
  const idx = cart.findIndex(i => i.id === id);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart();
  updateCartBadge();
  renderCart();
}

// ================================================================
//  CHECKOUT MODAL
// ================================================================
function checkout() {
  if (!localStorage.getItem('userEmail')) {
    toggleCart();
    showToast('Please login to checkout', 'error');
    setTimeout(() => window.location.href = 'login.html', 1200);
    return;
  }
  if (!cart.length) { showToast('Your cart is empty', 'error'); return; }
  document.getElementById('cartDrawer')?.classList.remove('open');
  document.getElementById('cartOverlay')?.classList.remove('show');
  openCheckoutModal();
}

function openCheckoutModal() {
  document.getElementById('checkoutModal')?.remove();
  const userName  = localStorage.getItem('userName')  || '';
  const userEmail = localStorage.getItem('userEmail') || '';

  const m = document.createElement('div');
  m.id        = 'checkoutModal';
  m.className = 'co-overlay';
  m.innerHTML = `
    <div class="co-modal">
      <div class="co-header">
        <div class="co-header-left"><span class="co-icon">🌿</span>
          <div><h2>Delivery Details</h2><p>Complete your order below</p></div>
        </div>
        <button class="co-close" onclick="closeCheckoutModal()">✕</button>
      </div>
      <div class="co-steps">
        <div class="co-step active" id="sdot1"><span>1</span> Details</div>
        <div class="co-step-line"></div>
        <div class="co-step" id="sdot2"><span>2</span> Review</div>
        <div class="co-step-line"></div>
        <div class="co-step" id="sdot3"><span>3</span> Done</div>
      </div>
      <div class="co-body" id="co-s1">
        <div class="co-section-title">📦 Shipping Information</div>
        <div class="co-form">
          <div class="co-form-row">
            <div class="co-field"><label>Full Name <span class="req">*</span></label>
              <input id="co-name" type="text" placeholder="Priya Sharma" value="${userName}"/></div>
            <div class="co-field"><label>Mobile Number <span class="req">*</span></label>
              <input id="co-mobile" type="tel" placeholder="98765 43210" maxlength="10"/></div>
          </div>
          <div class="co-form-row">
            <div class="co-field"><label>Email <span class="req">*</span></label>
              <input id="co-email" type="email" placeholder="you@example.com" value="${userEmail}"/></div>
            <div class="co-field"><label>Pincode <span class="req">*</span></label>
              <input id="co-pin" type="text" placeholder="380001" maxlength="6"/></div>
          </div>
          <div class="co-field full"><label>Address Line 1 <span class="req">*</span></label>
            <input id="co-addr1" type="text" placeholder="House No., Street, Area"/></div>
          <div class="co-field full"><label>Address Line 2 <span style="color:var(--text-light)">(optional)</span></label>
            <input id="co-addr2" type="text" placeholder="Landmark, Apartment"/></div>
          <div class="co-form-row">
            <div class="co-field"><label>City <span class="req">*</span></label>
              <input id="co-city" type="text" placeholder="Ahmedabad"/></div>
            <div class="co-field"><label>State <span class="req">*</span></label>
              <select id="co-state">
                <option value="">Select State</option>
                <option>Andhra Pradesh</option><option>Arunachal Pradesh</option>
                <option>Assam</option><option>Bihar</option><option>Chhattisgarh</option>
                <option>Goa</option><option>Gujarat</option><option>Haryana</option>
                <option>Himachal Pradesh</option><option>Jharkhand</option>
                <option>Karnataka</option><option>Kerala</option><option>Madhya Pradesh</option>
                <option>Maharashtra</option><option>Manipur</option><option>Meghalaya</option>
                <option>Mizoram</option><option>Nagaland</option><option>Odisha</option>
                <option>Punjab</option><option>Rajasthan</option><option>Sikkim</option>
                <option>Tamil Nadu</option><option>Telangana</option><option>Tripura</option>
                <option>Uttar Pradesh</option><option>Uttarakhand</option><option>West Bengal</option>
                <option>Delhi</option><option>Jammu &amp; Kashmir</option>
              </select>
            </div>
          </div>
          <div class="co-section-title" style="margin-top:1rem">💳 Payment Method</div>
          <div class="co-payment-opts">
            <label class="co-pay-opt active"><input type="radio" name="pay" value="Cash on Delivery" checked/>
              <span class="co-pay-icon">💵</span><div><strong>Cash on Delivery</strong><small>Pay when it arrives</small></div><span class="co-pay-check">✓</span></label>
            <label class="co-pay-opt"><input type="radio" name="pay" value="UPI"/>
              <span class="co-pay-icon">📱</span><div><strong>UPI / GPay / PhonePe</strong><small>Instant UPI payment</small></div><span class="co-pay-check">✓</span></label>
            <label class="co-pay-opt"><input type="radio" name="pay" value="Card"/>
              <span class="co-pay-icon">💳</span><div><strong>Credit / Debit Card</strong><small>Visa, Mastercard, RuPay</small></div><span class="co-pay-check">✓</span></label>
          </div>
        </div>
        <div class="co-footer">
          <button class="co-btn-ghost" onclick="closeCheckoutModal()">← Back</button>
          <button class="co-btn-primary" onclick="coReview()">Review Order →</button>
        </div>
      </div>
      <div class="co-body" id="co-s2" style="display:none">
        <div class="co-section-title">🛒 Order Summary</div>
        <div id="co-review-items"></div>
        <div class="co-review-total">
          <div class="co-review-row"><span>Subtotal</span><span id="rv-sub"></span></div>
          <div class="co-review-row"><span>Delivery</span><span class="co-free">FREE 🎉</span></div>
          <div class="co-review-row total-row"><span>Grand Total</span><span id="rv-total"></span></div>
        </div>
        <div class="co-section-title" style="margin-top:1.5rem">📍 Delivering To</div>
        <div class="co-address-box" id="co-addr-box"></div>
        <div class="co-footer">
          <button class="co-btn-ghost" onclick="coStep(1)">← Edit</button>
          <button class="co-btn-primary" id="co-place-btn" onclick="coPlace()">Place Order 🎉</button>
        </div>
      </div>
      <div class="co-body" id="co-s3" style="display:none">
        <div class="co-success">
          <span class="co-success-icon">🎉</span>
          <h2>Order Placed!</h2>
          <p>Thank you for shopping with <strong>Shree Data</strong>.</p>
          <p>Delivery in <strong>3–5 business days</strong>.</p>
          <div class="co-order-id" id="co-order-id"></div>
          <div class="co-success-details" id="co-suc-details"></div>
          <button class="co-btn-primary" onclick="closeCheckoutModal()" style="margin-top:2rem;width:100%">Continue Shopping →</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(m);
  requestAnimationFrame(() => m.classList.add('show'));
  m.querySelectorAll('.co-pay-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      m.querySelectorAll('.co-pay-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });
}

function closeCheckoutModal() {
  const m = document.getElementById('checkoutModal');
  if (!m) return;
  m.classList.remove('show');
  setTimeout(() => m.remove(), 300);
}

function coStep(n) {
  [1,2,3].forEach(i => {
    const body = document.getElementById('co-s' + i);
    const dot  = document.getElementById('sdot' + i);
    if (body) body.style.display = i === n ? 'block' : 'none';
    if (dot)  dot.className = 'co-step' + (i < n ? ' done' : '') + (i === n ? ' active' : '');
  });
  document.querySelector('.co-modal')?.scrollTo({ top: 0, behavior: 'smooth' });
}

function coReview() {
  const required = [
    { id:'co-name',   label:'Full Name' },
    { id:'co-mobile', label:'Mobile Number' },
    { id:'co-email',  label:'Email' },
    { id:'co-addr1',  label:'Address Line 1' },
    { id:'co-city',   label:'City' },
    { id:'co-state',  label:'State' },
    { id:'co-pin',    label:'Pincode' },
  ];
  for (const f of required) {
    const el = document.getElementById(f.id);
    if (!el?.value.trim()) {
      el?.focus(); el?.classList.add('co-field-error');
      showToast(f.label + ' is required', 'error');
      setTimeout(() => el?.classList.remove('co-field-error'), 2000);
      return;
    }
  }
  if (!/^[6-9]\d{9}$/.test(document.getElementById('co-mobile').value)) {
    document.getElementById('co-mobile').focus();
    showToast('Enter a valid 10-digit mobile number', 'error'); return;
  }
  if (!/^\d{6}$/.test(document.getElementById('co-pin').value)) {
    document.getElementById('co-pin').focus();
    showToast('Enter a valid 6-digit pincode', 'error'); return;
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('rv-sub').textContent   = '₹' + total.toFixed(0);
  document.getElementById('rv-total').textContent = '₹' + total.toFixed(0);
  document.getElementById('co-review-items').innerHTML = cart.map(item => `
    <div class="co-review-item">
      <div class="co-ri-img">${item.image ? `<img src="${item.image}" onerror="this.outerHTML='🫒'">` : '🫒'}</div>
      <div class="co-ri-info"><div class="co-ri-name">${item.name}</div><div class="co-ri-qty">Qty: ${item.qty}</div></div>
      <div class="co-ri-price">₹${(item.price * item.qty).toFixed(0)}</div>
    </div>`).join('');
  const name  = document.getElementById('co-name').value.trim();
  const mob   = document.getElementById('co-mobile').value.trim();
  const a1    = document.getElementById('co-addr1').value.trim();
  const a2    = document.getElementById('co-addr2').value.trim();
  const city  = document.getElementById('co-city').value.trim();
  const state = document.getElementById('co-state').value;
  const pin   = document.getElementById('co-pin').value.trim();
  const pay   = document.querySelector('input[name="pay"]:checked')?.value || 'Cash on Delivery';
  document.getElementById('co-addr-box').innerHTML =
    `<strong>${name}</strong> · 📞 ${mob}<br/>
     ${a1}${a2 ? ', ' + a2 : ''}<br/>
     ${city}, ${state} — ${pin}<br/>
     <span class="co-pay-badge">💳 ${pay}</span>`;
  coStep(2);
}

async function coPlace() {
  const btn   = document.getElementById('co-place-btn');
  const email = localStorage.getItem('userEmail');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const name  = document.getElementById('co-name').value.trim();
  const mob   = document.getElementById('co-mobile').value.trim();
  const a1    = document.getElementById('co-addr1').value.trim();
  const a2    = document.getElementById('co-addr2').value.trim();
  const city  = document.getElementById('co-city').value.trim();
  const state = document.getElementById('co-state').value;
  const pin   = document.getElementById('co-pin').value.trim();
  const pay   = document.querySelector('input[name="pay"]:checked')?.value || 'Cash on Delivery';
  const addr  = `${a1}${a2 ? ', ' + a2 : ''}, ${city}, ${state} - ${pin}`;
  btn.textContent = 'Placing Order...'; btn.disabled = true;
  const done = orderId => {
    cart = []; saveCart(); updateCartBadge();
    document.getElementById('co-order-id').textContent = 'Order ID: ' + orderId;
    document.getElementById('co-suc-details').innerHTML = `
      <div class="co-suc-row"><span>Name</span><strong>${name}</strong></div>
      <div class="co-suc-row"><span>Mobile</span><strong>${mob}</strong></div>
      <div class="co-suc-row"><span>Address</span><strong>${addr}</strong></div>
      <div class="co-suc-row"><span>Payment</span><strong>${pay}</strong></div>
      <div class="co-suc-row"><span>Total</span><strong>₹${total.toFixed(0)}</strong></div>`;
    coStep(3);
  };
  try {
    // Strip base64 images from cart — they make the URL too long for JSONP
    const cartForSheet = cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));
    const res = await jsonp({
      action: 'addOrder', userEmail: email,
      products: encodeURIComponent(JSON.stringify(cartForSheet)),
      totalPrice: total.toFixed(2), custName: name,
      mobile: mob, address: addr, city, state, pincode: pin, payment: pay
    });
    if (res.success) done(res.orderId);
    else {
      showToast(res.message || 'Order failed', 'error');
      btn.textContent = 'Place Order 🎉';
      btn.disabled = false;
    }
  } catch(err) {
    showToast('Order failed: ' + err.message, 'error');
    btn.textContent = 'Place Order 🎉';
    btn.disabled = false;
  }
}

// ================================================================
//  CONTACT FORM
// ================================================================
function submitContact(e) {
  e.preventDefault();
  showToast("Message sent! We'll get back to you soon 🌿");
  e.target.reset();
}

// ================================================================
//  LOAD PRODUCTS
// ================================================================
async function loadProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = Array(8).fill(`
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
    </div>`).join('');
  try {
    const res   = await jsonp({ action: 'getProducts' });
    allProducts = (res.data || []).filter(p => p['ProductID']);
    if (!allProducts.length) allProducts = demoProducts();
  } catch {
    allProducts = demoProducts();
  }
  buildCategoryTabs();
  renderProducts();
}

function demoProducts() {
  return [
    { ProductID:'D1','Product Name':'Cold-Pressed Coconut Oil',Price:299,Description:'Pure virgin coconut oil cold-pressed to retain all natural nutrients.','Image URL':'',Stock:50,Category:'Cooking Oils'},
    { ProductID:'D2','Product Name':'Extra Virgin Olive Oil',  Price:599,Description:'Premium quality olive oil from hand-picked olives.','Image URL':'',Stock:30,Category:'Cooking Oils'},
    { ProductID:'D3','Product Name':'Cold-Pressed Sesame Oil', Price:349,Description:'Traditional wood-pressed sesame oil with authentic aroma.','Image URL':'',Stock:45,Category:'Cooking Oils'},
    { ProductID:'D4','Product Name':'Pure Castor Oil',         Price:199,Description:'Organic castor oil for hair growth and deep nourishment.','Image URL':'',Stock:60,Category:'Hair Oils'},
    { ProductID:'D5','Product Name':'Argan Oil',               Price:799,Description:'Liquid gold for hair and skin.','Image URL':'',Stock:25,Category:'Hair Oils'},
    { ProductID:'D6','Product Name':'Lavender Essential Oil',  Price:449,Description:'Pure therapeutic-grade lavender oil for aromatherapy.','Image URL':'',Stock:35,Category:'Essential Oils'},
    { ProductID:'D7','Product Name':'Neem Oil',                Price:179,Description:'Cold-pressed organic neem oil for skin and hair care.','Image URL':'',Stock:55,Category:'Herbal Oils'},
    { ProductID:'D8','Product Name':'Rosehip Seed Oil',        Price:649,Description:'Anti-aging rosehip oil rich in vitamins A and C.','Image URL':'',Stock:20,Category:'Skin Oils'},
  ];
}

function buildCategoryTabs() {
  const el = document.getElementById('categoryTabs');
  if (!el) return;
  const cats = ['All', ...new Set(allProducts.map(p => p.Category).filter(Boolean))];
  el.innerHTML = cats.map((c, i) =>
    `<button class="cat-tab${i===0?' active':''}" onclick="setCategory('${c.toLowerCase()}',this)">${c}</button>`
  ).join('');
}

function setCategory(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  renderProducts();
}

function renderProducts() {
  const grid    = document.getElementById('productsGrid');
  const emptyEl = document.getElementById('productsEmpty');
  if (!grid) return;
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const filtered = allProducts.filter(p => {
    const catOk  = activeCategory === 'all' || (p.Category || '').toLowerCase() === activeCategory;
    const srchOk = !q ||
      (p['Product Name'] || '').toLowerCase().includes(q) ||
      (p.Description     || '').toLowerCase().includes(q) ||
      (p.Category        || '').toLowerCase().includes(q);
    return catOk && srchOk;
  });
  if (!filtered.length) {
    grid.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  const emojiMap = {'Cooking Oils':'🫒','Hair Oils':'🌾','Skin Oils':'✨','Essential Oils':'🌸','Herbal Oils':'🌿'};
  grid.innerHTML = filtered.map((p, i) => {
    const stock    = parseInt(p.Stock || 0);
    const sc       = stock === 0 ? 'out' : stock < 10 ? 'low' : '';
    const sl       = stock === 0 ? 'Out of Stock' : stock < 10 ? `Only ${stock} left` : `${stock} in stock`;
    const emoji    = emojiMap[p.Category] || '🫒';
    const img      = p['Image URL'] || '';
    const safeName = (p['Product Name'] || '').replace(/'/g, "\\'");
    const price    = parseFloat(p.Price || 0).toFixed(0);
    return `
    <div class="product-card reveal" style="animation-delay:${Math.min(i,7)*0.06}s">
      <div class="product-img">
        ${img ? `<img src="${img}" alt="${p['Product Name']}" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
        <span style="font-size:5rem;display:${img?'none':'flex'};align-items:center;justify-content:center;width:100%;height:100%">${emoji}</span>
      </div>
      <div class="product-body">
        <div class="product-category">${p.Category || 'Organic Oil'}</div>
        <div class="product-name">${p['Product Name']}</div>
        <div class="product-desc">${p.Description || ''}</div>
        <div class="product-footer">
          <div>
            <div class="product-price">₹${price}</div>
            <div class="product-stock ${sc}">${sl}</div>
          </div>
          <button class="add-to-cart" ${stock===0?'disabled':''}
            onclick="addToCart('${p.ProductID}','${safeName}','${price}','${img}')">
            ${stock===0?'Out of Stock':'Add to Cart'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
  setTimeout(() => {
    document.querySelectorAll('.reveal').forEach(el => {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) e.target.classList.add('visible');
      }, { threshold: .1 }).observe(el);
    });
  }, 60);
}

// ================================================================
//  DOM READY
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior:'smooth' }); document.getElementById('navLinks')?.classList.remove('open'); }
    });
  });
  document.querySelectorAll('.reveal').forEach(el => {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) e.target.classList.add('visible');
    }, { threshold: .1 }).observe(el);
  });
});