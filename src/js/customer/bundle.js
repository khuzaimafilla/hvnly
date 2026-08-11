/**
 * Heavenly Food — Customer Application Bundle (Compatible with file:// & http://)
 */
(function () {
  'use strict';

  // --- 1. LOCAL STORAGE CART MANAGER ---
  const CART_KEY = 'hvnly_cart_session';
  const CUSTOMER_KEY = 'hvnly_customer_info';

  class CartManager {
    static getCart() {
      try {
        const data = localStorage.getItem(CART_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    }

    static saveCart(cart) {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
      } catch (e) {}
    }

    static addItem(menuItem, quantity) {
      quantity = quantity || 1;
      const cart = this.getCart();
      const index = cart.findIndex(function (item) {
        return String(item.id) === String(menuItem.id);
      });

      if (index > -1) {
        cart[index].quantity += quantity;
      } else {
        cart.push({
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          image: menuItem.image || 'public/images/logo.png',
          quantity: quantity
        });
      }
      this.saveCart(cart);
      return cart;
    }

    static updateQty(itemId, quantity) {
      let cart = this.getCart();
      const qty = parseInt(quantity, 10);
      if (qty <= 0) {
        cart = cart.filter(function (item) {
          return String(item.id) !== String(itemId);
        });
      } else {
        const idx = cart.findIndex(function (item) {
          return String(item.id) === String(itemId);
        });
        if (idx > -1) cart[idx].quantity = qty;
      }
      this.saveCart(cart);
      return cart;
    }

    static clearCart() {
      localStorage.removeItem(CART_KEY);
      return [];
    }

    static getTotalItems() {
      return this.getCart().reduce(function (total, item) {
        return total + (item.quantity || 1);
      }, 0);
    }

    static getTotalPrice() {
      return this.getCart().reduce(function (total, item) {
        return total + item.price * (item.quantity || 1);
      }, 0);
    }

    static getCustomerInfo() {
      try {
        const data = localStorage.getItem(CUSTOMER_KEY);
        return data ? JSON.parse(data) : { name: '', phone: '', gmaps: '', notes: '' };
      } catch (e) {
        return { name: '', phone: '', gmaps: '', notes: '' };
      }
    }

    static saveCustomerInfo(info) {
      try {
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(info));
      } catch (e) {}
    }
  }

  // --- 2. CRYPTO & TOKEN ENCODER ---
  function encodeToken(payload) {
    try {
      const jsonStr = JSON.stringify(payload);
      return btoa(encodeURIComponent(jsonStr))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    } catch (e) {
      return '';
    }
  }

  // --- 3. HELPERS & FORMATTERS ---
  function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(number).replace('IDR', 'Rp').trim();
  }

  // --- 4. GEOLOCATION ---
  function initGeolocation() {
    const geoBtn = document.getElementById('btn-use-geolocation');
    const gmapsInput = document.getElementById('cust-gmaps');

    if (geoBtn && gmapsInput) {
      geoBtn.addEventListener('click', function () {
        if (!navigator.geolocation) {
          alert('Geolocation tidak didukung oleh browser Anda.');
          return;
        }

        geoBtn.disabled = true;
        geoBtn.textContent = 'Mengambil Lokasi...';

        navigator.geolocation.getCurrentPosition(
          function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            gmapsInput.value = 'https://maps.google.com/?q=' + lat + ',' + lng;
            geoBtn.disabled = false;
            geoBtn.textContent = 'Lokasi Berhasil Ditemukan';
          },
          function (error) {
            alert('Gagal mengambil lokasi. Mohon masukkan link Google Maps secara manual.');
            geoBtn.disabled = false;
            geoBtn.textContent = 'Gunakan Lokasi Saat Ini';
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }
  }

  // --- 5. CHECKOUT PROCESSOR ---
  async function shortenUrl(longUrl) {
    try {
      const fetchPromise = fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(longUrl)).then(function (res) {
        if (res.ok) return res.text();
        return longUrl;
      });
      const timeoutPromise = new Promise(function (resolve) {
        setTimeout(function () { resolve(longUrl); }, 1200);
      });
      const resText = await Promise.race([fetchPromise, timeoutPromise]);
      if (resText && typeof resText === 'string' && resText.indexOf('http') === 0) {
        return resText.trim();
      }
    } catch (err) {
      console.warn('URL shortener fallback triggered:', err);
    }
    return longUrl;
  }

  async function executePaymentSuccessAndOpenWA(verifiedToken) {
    if (!pendingOrderData) return;

    const qrisBtn = document.getElementById('qris-confirm-paid-btn');
    if (qrisBtn) {
      qrisBtn.disabled = true;
      qrisBtn.textContent = 'Menghubungkan ke WA...';
    }

    try {
      const customerInfo = pendingOrderData.customerInfo;
      const cart = pendingOrderData.cart;
      const totalAmount = pendingOrderData.totalAmount;
      const signedToken = pendingOrderData.signedToken;

      const name = customerInfo.name;
      const phone = customerInfo.phone;
      const gmaps = customerInfo.gmaps;
      const notes = customerInfo.notes;

      const orderId = '#HVN-' + Date.now().toString().slice(-6);
      
      const compactPayload = {
        id: orderId,
        n: name,
        p: phone,
        i: cart.map(function (x) { return [x.id, x.quantity || 1, x.price, x.name]; }),
        t: totalAmount,
        g: gmaps || '',
        nt: notes || '',
        s: 'PAID',
        ts: Date.now()
      };

      const finalToken = verifiedToken || signedToken || encodeToken(compactPayload);

      let baseUrl;
      if (window.location.protocol.indexOf('http') === 0) {
        const currentPath = window.location.pathname;
        const dirPath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
        baseUrl = window.location.origin + dirPath;
      } else {
        baseUrl = 'https://hvnly.vercel.app/';
      }

      const rawAdminVerifierUrl = baseUrl + 'admin.html?token=' + finalToken;
      const adminVerifierUrl = await shortenUrl(rawAdminVerifierUrl);

      const itemListFormatted = cart.map(function (item) {
        return '- ' + item.quantity + 'x ' + item.name + ' (' + formatRupiah(item.price * item.quantity) + ')';
      }).join('\n');

      const waText = '[PESANAN BARU - LUNAS]\n\n' +
        '*Order ID:* `' + orderId + '`\n' +
        '*Pemesan:* ' + name + ' (' + phone + ')\n' +
        '*Lokasi:* ' + (gmaps || 'Tidak dilampirkan') + '\n' +
        '*Catatan:* ' + (notes || '-') + '\n\n' +
        '*Pesanan:*\n' + itemListFormatted + '\n\n' +
        '*Total:* ' + formatRupiah(totalAmount) + ' (QRIS)\n\n' +
        '*Link Verifikasi:*\n' + adminVerifierUrl + '\n\n' +
        'Mohon diproses, terima kasih.';

      const adminPhone = '6282132517964';
      const waUrl = 'https://wa.me/' + adminPhone + '?text=' + encodeURIComponent(waText);

      const qrisModal = document.getElementById('qris-modal');
      if (qrisModal) qrisModal.setAttribute('aria-hidden', 'true');

      CartManager.clearCart();
      pendingOrderData = null;
      window.open(waUrl, '_blank');
    } catch (e) {
      console.error('WA redirect error:', e);
    } finally {
      if (qrisBtn) {
        qrisBtn.disabled = false;
        qrisBtn.textContent = 'Saya Sudah Bayar (Konfirmasi & Kirim ke WA)';
      }
    }
  }

  function processCustomerCheckout() {
    const nameEl = document.getElementById('cust-name');
    const phoneEl = document.getElementById('cust-phone');
    const gmapsEl = document.getElementById('cust-gmaps');
    const notesEl = document.getElementById('cust-notes');

    const name = nameEl ? nameEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const gmaps = gmapsEl ? gmapsEl.value.trim() : '';
    const notes = notesEl ? notesEl.value.trim() : '';

    if (!name || !phone) {
      alert('Mohon lengkapi Nama Lengkap dan Nomor WhatsApp Anda.');
      return;
    }

    const customerInfo = { name: name, phone: phone, gmaps: gmaps, notes: notes };
    CartManager.saveCustomerInfo(customerInfo);

    const cart = CartManager.getCart();
    const totalAmount = CartManager.getTotalPrice();

    pendingOrderData = { customerInfo: customerInfo, cart: cart, totalAmount: totalAmount };

    // Close checkout form modal
    const checkoutModal = document.getElementById('checkout-modal');
    if (checkoutModal) checkoutModal.setAttribute('aria-hidden', 'true');

    // Set total Rupiah amount in QRIS modal
    const amountVal = document.getElementById('qris-amount-val');
    if (amountVal) amountVal.textContent = formatRupiah(totalAmount);

    // Open QRIS payment modal instantly (0ms delay!)
    const qrisModal = document.getElementById('qris-modal');
    if (qrisModal) qrisModal.setAttribute('aria-hidden', 'false');

    const payBtn = document.getElementById('pay-submit-btn');
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = 'Bayar Sekarang (QRIS / E-Wallet)';
    }
  }

  // --- 6. FALLBACK MENU DATA ---
  const FALLBACK_DATA = {
    about: {
      description: "Heavenly adalah bisnis makanan rumahan di Malang yang menyajikan hidangan comfort food berkualitas dengan bahan segar dan rasa otentik."
    },
    menu: [
      { id: 1, name: "Nasi Ayam Teriyaki", description: "Ayam bakar khas dengan bumbu manis-gurih teriyaki empuk juicy.", short: "Nasi + Ayam Saus Teriyaki + Telur.", price: 12000, image: "public/images/menu/teriyaki.png", category: "Rice Bowl" },
      { id: 2, name: "Nasi Tongkol Suwir", description: "Ikan tongkol suwir pedas manis disajikan dengan bihun renyah.", short: "Nasi + Tongkol Suwir + Bihun Goreng.", price: 12000, image: "public/images/menu/tongkol.png", category: "Rice Bowl" },
      { id: 3, name: "Nasi Telur Balado", description: "Telur goreng dengan sambal balado pedas segar & oseng sayur.", short: "Nasi + Telur Balado + Oseng Sayur.", price: 12000, image: "public/images/menu/balado.png", category: "Rice Bowl" },
      { id: 4, name: "Salad Buah - Kecil", description: "Salad buah segar thinwall 250ml dressing keju melimpah.", short: "Salad Thinwall 250ml.", price: 15000, image: "public/images/menu/salad.png", category: "Salad Buah" },
      { id: 5, name: "Salad Buah - Besar", description: "Salad buah segar porsi besar topping keju parut melimpah.", short: "Salad Thinwall 400ml.", price: 23000, image: "public/images/menu/salad.png", category: "Salad Buah" },
      { id: 6, name: "TERBATAS - Nasi Kikir", description: "Menu terbatas hari ini!", short: "Nasi + Kikil Rempah + Sambal Matah.", price: 8000, image: "public/images/menu/limited.png", category: "Menu Spesial" },
      { id: 7, name: "Paket Jumat Berkah", description: "Paket spesial hari Jumat! Minimum 10 pcs.", short: "Paket spesial (min 10 pcs) - Pilih 1 menu nasi favorit.", price: 10000, image: "public/images/menu/jumat.png", isSpecial: true, category: "Menu Spesial" }
    ],
    gallery: [
      "public/images/gallery/1.png",
      "public/images/gallery/2.png",
      "public/images/gallery/3.png",
      "public/images/gallery/4.png"
    ],
    testimonials: [
      { name: "Budi", comment: "Enak banget, porsinya pas dan rasanya seperti masakan rumah!" },
      { name: "Sari", comment: "Packing rapi dan delivery cepat. Recomended!" },
      { name: "Andi", comment: "Nasi Ayam Teriyaki-nya juara! Pedas manisnya pas, wajib coba." },
      { name: "Rina", comment: "Salad buahnya segar banget, cocok buat diet. Harga ramah kantong!" },
      { name: "Doni", comment: "Paket Jumat Berkah worth it, hemat dan enak. Besok pesen lagi deh." },
      { name: "Lia", comment: "Layanan ramah, makanan masih hangat pas sampe. Heavenly emang heavenly!" }
    ],
    contact: {
      phone: "+6282132517964",
      instagram: "https://www.instagram.com/heavenly.fd/"
    }
  };

  let globalMenuData = [];
  let activeCategory = 'all';

  function hideLoader() {
    const loader = document.getElementById('loading');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(function () { loader.style.display = 'none'; }, 200);
    }
  }

  function renderAbout(about) {
    const el = document.getElementById('about-desc');
    if (el) el.textContent = about.description;
  }

  function renderCategoryTabs(items) {
    const tabs = document.getElementById('category-tabs');
    if (!tabs) return;

    const categories = ['all'];
    items.forEach(function (item) {
      let cat = item.category || (item.name.toLowerCase().indexOf('salad') > -1 ? 'Salad Buah' : item.name.toLowerCase().indexOf('nasi') > -1 ? 'Rice Bowl' : 'Menu Spesial');
      if (categories.indexOf(cat) === -1) categories.push(cat);
    });

    const labels = { all: 'Semua Menu', 'Rice Bowl': 'Rice Bowl', 'Salad Buah': 'Salad Buah', 'Menu Spesial': 'Menu Spesial' };

    tabs.innerHTML = categories
      .map(function (cat) {
        return '<button class="category-tab ' + (cat === activeCategory ? 'active' : '') + '" data-category="' + cat + '">' + (labels[cat] || cat) + '</button>';
      })
      .join('');
  }

  function fixImgPath(p) {
    if (!p) return 'public/images/logo.png';
    if (p.indexOf('images/') === 0 && p.indexOf('public/') !== 0) {
      return 'public/' + p;
    }
    return p;
  }

  function renderMenuGrid(items) {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;

    grid.innerHTML = items
      .map(function (item) {
        const isSpecial = item.isSpecial;
        const imgUrl = fixImgPath(item.image);
        return '<article class="menu-item ' + (isSpecial ? 'special' : '') + '">' +
          '<div class="thumb"><img src="' + imgUrl + '" alt="' + item.name + '" loading="lazy"></div>' +
          '<div class="meta">' +
            '<h3>' + item.name + '</h3>' +
            '<p>' + (item.short || item.description) + '</p>' +
            '<div class="menu-item-foot">' +
              '<div>' +
                '<div class="price">' + formatRupiah(item.price) + (isSpecial ? ' / pcs' : '') + '</div>' +
                (isSpecial ? '<div class="special-note">Min. 10 pcs - Harga spesial Rp 10.000/pcs!</div>' : '') +
              '</div>' +
              '<div style="display:flex;gap:8px;align-items:center;">' +
                '<button class="btn ghost btn-detail" data-id="' + item.id + '">Detail</button>' +
                '<button class="btn primary btn-add" data-id="' + item.id + '">Tambah</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</article>';
      })
      .join('');
  }

  function renderGallery(imgs) {
    const g = document.getElementById('gallery-grid');
    if (!g || !imgs) return;
    g.innerHTML = imgs.map(function (src, i) {
      return '<div class="gallery-item"><img src="' + src + '" alt="Galeri ' + (i + 1) + '" loading="lazy"></div>';
    }).join('');
  }

  function renderTesti(t) {
    const g = document.getElementById('testi-grid');
    if (!g || !t) return;
    g.innerHTML = t.slice(0, 6).map(function (x) {
      return '<div class="testi-item"><strong>' + x.name + '</strong><p>' + x.comment + '</p></div>';
    }).join('');
  }

  function setContact(c) {
    const phone = document.getElementById('contact-phone');
    const insta = document.getElementById('contact-insta');
    if (phone) { phone.textContent = c.phone; phone.href = 'tel:' + c.phone; }
    if (insta) insta.href = c.instagram;
  }

  function updateCartBadge() {
    const count = CartManager.getTotalItems();
    const badges = document.querySelectorAll('#cart-count, .cart-count-badge');
    badges.forEach(function (b) { b.textContent = count; });
  }

  function renderCartUI() {
    const body = document.getElementById('cartBody');
    const totalEl = document.getElementById('cartTotal');
    if (!body || !totalEl) return;

    const cart = CartManager.getCart();
    if (cart.length === 0) {
      body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Keranjang kosong</div>';
      totalEl.textContent = formatRupiah(0);
      return;
    }

    body.innerHTML = cart
      .map(function (item) {
        return '<div class="cart-item">' +
          '<img src="' + fixImgPath(item.image) + '" alt="' + item.name + '">' +
          '<div style="flex:1">' +
            '<strong>' + item.name + '</strong>' +
            '<div style="color:var(--text-muted);font-size:0.88rem">' + formatRupiah(item.price) + ' x ' + item.quantity + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:4px">' +
            '<button class="btn ghost cart-dec" data-id="' + item.id + '">-</button>' +
            '<button class="btn ghost cart-inc" data-id="' + item.id + '">+</button>' +
          '</div>' +
        '</div>';
      })
      .join('');

    totalEl.textContent = formatRupiah(CartManager.getTotalPrice());
  }

  let modalQty = 1;

  function openDetailModal(item) {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-content');
    if (!modal || !content || !item) return;

    modalQty = 1;

    let rawCondiments = (item.short || item.name).split('+');
    let condimentsHTML = rawCondiments.map(function (c) {
      return '<span class="condiment-tag">' + c.trim() + '</span>';
    }).join('');

    content.innerHTML =
      '<div class="modal-detail-hero">' +
        '<img src="' + fixImgPath(item.image) + '" alt="' + item.name + '">' +
        '<span class="modal-detail-badge">' + (item.category || 'Rice Bowl') + '</span>' +
      '</div>' +
      '<div class="modal-detail-content">' +
        '<div class="modal-detail-header">' +
          '<h2 class="modal-detail-title">' + item.name + '</h2>' +
          '<div class="modal-detail-price">' + formatRupiah(item.price) + (item.isSpecial ? ' / pcs' : '') + '</div>' +
        '</div>' +
        '<div class="modal-detail-section">' +
          '<span class="modal-detail-label">Kondimen & Isian Paket</span>' +
          '<div class="condiment-tags">' + condimentsHTML + '</div>' +
        '</div>' +
        '<div class="modal-detail-section">' +
          '<span class="modal-detail-label">Deskripsi Menu</span>' +
          '<p class="modal-detail-desc">' + item.description + '</p>' +
        '</div>' +
        '<div class="modal-detail-footer">' +
          '<div class="qty-selector">' +
            '<button class="qty-btn modal-dec">-</button>' +
            '<span class="qty-val" id="modal-qty-val">1</span>' +
            '<button class="qty-btn modal-inc">+</button>' +
          '</div>' +
          '<button class="btn primary modal-add-btn" data-id="' + item.id + '" style="flex:1;">+ Tambah ke Keranjang</button>' +
        '</div>' +
      '</div>';

    modal.setAttribute('aria-hidden', 'false');
  }

  function setupGlobalDelegation() {
    document.addEventListener('click', function (e) {
      const detailBtn = e.target.closest('.btn-detail');
      if (detailBtn) {
        e.preventDefault();
        const id = detailBtn.dataset.id;
        const item = globalMenuData.find(function (m) { return String(m.id) === String(id); });
        if (item) openDetailModal(item);
        return;
      }

      const modalClose = e.target.closest('#modal-close, .modal-backdrop');
      if (modalClose) {
        e.preventDefault();
        const modal = document.getElementById('modal');
        if (modal) modal.setAttribute('aria-hidden', 'true');
        return;
      }

      const modalInc = e.target.closest('.modal-inc');
      if (modalInc) {
        e.preventDefault();
        modalQty++;
        const qtyVal = document.getElementById('modal-qty-val');
        if (qtyVal) qtyVal.textContent = modalQty;
        return;
      }

      const modalDec = e.target.closest('.modal-dec');
      if (modalDec) {
        e.preventDefault();
        if (modalQty > 1) {
          modalQty--;
          const qtyVal = document.getElementById('modal-qty-val');
          if (qtyVal) qtyVal.textContent = modalQty;
        }
        return;
      }

      const modalAddBtn = e.target.closest('.modal-add-btn');
      if (modalAddBtn) {
        e.preventDefault();
        const id = modalAddBtn.dataset.id;
        const item = globalMenuData.find(function (m) { return String(m.id) === String(id); });
        if (item) {
          CartManager.addItem(item, modalQty);
          updateCartBadge();
          const modal = document.getElementById('modal');
          if (modal) modal.setAttribute('aria-hidden', 'true');
        }
        return;
      }

      const addBtn = e.target.closest('.btn-add, .add-to-cart');
      if (addBtn) {
        e.preventDefault();
        const id = addBtn.dataset.id;
        const item = globalMenuData.find(function (m) { return String(m.id) === String(id); });
        if (item) {
          CartManager.addItem(item, 1);
          updateCartBadge();
        }
        return;
      }

      const catBtn = e.target.closest('.category-tab');
      if (catBtn) {
        e.preventDefault();
        const category = catBtn.dataset.category;
        document.querySelectorAll('.category-tab').forEach(function (b) { b.classList.remove('active'); });
        catBtn.classList.add('active');
        activeCategory = category;
        const filtered = category === 'all' ? globalMenuData : globalMenuData.filter(function (i) { return (i.category || 'Nasi Box') === category; });
        renderMenuGrid(filtered);
        return;
      }

      const cartToggle = e.target.closest('#cartBtn, #cartClose');
      if (cartToggle) {
        e.preventDefault();
        const cartEl = document.getElementById('cart');
        if (cartEl) {
          const isHidden = cartEl.getAttribute('aria-hidden') === 'true';
          cartEl.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
          if (isHidden) renderCartUI();
        }
        return;
      }

      const clearCartBtn = e.target.closest('#clearCart');
      if (clearCartBtn) {
        e.preventDefault();
        CartManager.clearCart();
        updateCartBadge();
        renderCartUI();
        return;
      }

      const incBtn = e.target.closest('.cart-inc');
      if (incBtn) {
        e.preventDefault();
        const id = incBtn.dataset.id;
        const cart = CartManager.getCart();
        const item = cart.find(function (i) { return String(i.id) === String(id); });
        if (item) {
          CartManager.updateQty(id, item.quantity + 1);
          updateCartBadge();
          renderCartUI();
        }
        return;
      }

      const decBtn = e.target.closest('.cart-dec');
      if (decBtn) {
        e.preventDefault();
        const id = decBtn.dataset.id;
        const cart = CartManager.getCart();
        const item = cart.find(function (i) { return String(i.id) === String(id); });
        if (item) {
          CartManager.updateQty(id, item.quantity - 1);
          updateCartBadge();
          renderCartUI();
        }
        return;
      }

      const checkoutBtn = e.target.closest('#checkout');
      if (checkoutBtn) {
        e.preventDefault();
        const cart = CartManager.getCart();
        if (!cart.length) return alert('Keranjang kosong!');

        const cartModal = document.getElementById('cart');
        if (cartModal) cartModal.setAttribute('aria-hidden', 'true');

        const checkoutModal = document.getElementById('checkout-modal');
        if (checkoutModal) checkoutModal.setAttribute('aria-hidden', 'false');
        return;
      }

      const checkoutCloseBtn = e.target.closest('#checkout-modal-close');
      if (checkoutCloseBtn) {
        e.preventDefault();
        const checkoutModal = document.getElementById('checkout-modal');
        if (checkoutModal) checkoutModal.setAttribute('aria-hidden', 'true');
        return;
      }

      const qrisConfirmBtn = e.target.closest('#qris-confirm-paid-btn');
      if (qrisConfirmBtn) {
        e.preventDefault();
        executePaymentSuccessAndOpenWA();
        return;
      }

      const qrisCloseBtn = e.target.closest('#qris-cancel-btn, #qris-modal-close');
      if (qrisCloseBtn) {
        e.preventDefault();
        const qrisModal = document.getElementById('qris-modal');
        if (qrisModal) qrisModal.setAttribute('aria-hidden', 'true');
        return;
      }
    });

    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        await processCustomerCheckout();
      });
    }
  }

  async function initCustomerApp() {
    updateCartBadge();
    initGeolocation();
    setupGlobalDelegation();

    const safetyTimer = setTimeout(hideLoader, 200);

    try {
      let data = FALLBACK_DATA;
      try {
        const response = await fetch('data.json');
        if (response.ok) data = await response.json();
      } catch (e) {}

      globalMenuData = data.menu || FALLBACK_DATA.menu;
      renderAbout(data.about || FALLBACK_DATA.about);
      renderCategoryTabs(globalMenuData);
      renderMenuGrid(globalMenuData);
      renderGallery(data.gallery || FALLBACK_DATA.gallery);
      renderTesti(data.testimonials || FALLBACK_DATA.testimonials);
      setContact(data.contact || FALLBACK_DATA.contact);
    } catch (err) {
      console.error('Init error:', err);
    } finally {
      clearTimeout(safetyTimer);
      hideLoader();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomerApp);
  } else {
    initCustomerApp();
  }
})();
