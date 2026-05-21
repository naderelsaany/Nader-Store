// =============================================
// Nader Store — Web App.js
// Firebase Firestore + Auth + Cart + Dynamic Sizes Edit
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBl8zJSJ_mW36eFQ7UajCMKgYsAEPDMezs",
  authDomain: "nader-store-39cde.firebaseapp.com",
  projectId: "nader-store-39cde",
  storageBucket: "nader-store-39cde.firebasestorage.app",
  messagingSenderId: "1054720474892",
  appId: "1:1054720474892:web:1a9674a45893bb8189d329"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

const ADMIN_EMAIL = "admin@naderstore.com";
const GLOBAL_WHATSAPP = "201015409872";

let currentMerchantId = localStorage.getItem('merchantId') || null;
let currentMerchantName = localStorage.getItem('merchantName') || "تاجر نادر ستور";

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if(t) {
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }
}

window.showScreen = function(screenName) {
  const screens = { store: document.getElementById('screenStore'), admin: document.getElementById('screenAdmin'), merchant: document.getElementById('screenMerchant') };
  const navActions = document.getElementById('navActions');
  const navStoreBtn = document.getElementById('navStore');

  Object.keys(screens).forEach(key => { if(screens[key]) screens[key].classList.remove('active'); });
  if(screens[screenName]) screens[screenName].classList.add('active');
  if(navActions) navActions.classList.remove('mobile-open');

  if (navStoreBtn) {
    if (screenName === 'store') {
      navStoreBtn.innerHTML = (currentMerchantId || (auth.currentUser && auth.currentUser.email === ADMIN_EMAIL)) ? '⚙️ لوحة التحكم' : '🏪 المتجر';
    } else {
      navStoreBtn.innerHTML = '🏪 المتجر';
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.toggleSizeFields = function() {
    const type = document.getElementById('newProductSizeType').value;
    document.getElementById('fieldOneSize').classList.add('hidden');
    document.getElementById('fieldLetters').classList.add('hidden');
    document.getElementById('fieldNumbers').classList.add('hidden');

    if(type === 'none') document.getElementById('fieldOneSize').classList.remove('hidden');
    if(type === 'letters') document.getElementById('fieldLetters').classList.remove('hidden');
    if(type === 'numbers') document.getElementById('fieldNumbers').classList.remove('hidden');
}

// ===================== [عربة التسوق] =====================
window.webCart = JSON.parse(localStorage.getItem('naderWebCart')) || [];
window.saveWebCart = function() { localStorage.setItem('naderWebCart', JSON.stringify(window.webCart)); window.updateWebCartUI(); }

window.addToWebCart = function(id, name, price, hasSizes) {
  let selectedSize = '';
  if (hasSizes) {
      const selectEl = document.getElementById(`sizeSelect_${id}`);
      if (!selectEl || !selectEl.value) { showToast("⚠️ يرجى اختيار المقاس المناسب أولاً!", true); return; }
      selectedSize = selectEl.value;
  }
  const cartId = hasSizes ? `${id}_${selectedSize}` : id;
  const displayName = hasSizes ? `${name} (مقاس: ${selectedSize})` : name;

  const existingItem = window.webCart.find(item => item.cartId === cartId);
  if(existingItem) { existingItem.qty += 1; } else { window.webCart.push({ cartId, id, name: displayName, price: parseFloat(price), qty: 1, size: selectedSize }); }
  window.saveWebCart();
  document.getElementById('postAddModal').classList.add('open');
}

window.closePostAddModal = function() { document.getElementById('postAddModal').classList.remove('open'); }
window.openCartFromPrompt = function() { window.closePostAddModal(); document.getElementById('cartModal').classList.add('open'); }
window.updateWebCartQty = function(cartId, delta) {
  const item = window.webCart.find(item => item.cartId === cartId);
  if(item) { item.qty += delta; if(item.qty <= 0) { window.webCart = window.webCart.filter(i => i.cartId !== cartId); } window.saveWebCart(); }
}

window.updateWebCartUI = function() {
  const badge = document.getElementById('cartCountBadge');
  const container = document.getElementById('cartItemsContainer');
  const totalEl = document.getElementById('cartTotalPrice');
  let totalQty = 0, totalPrice = 0;

  if(badge && container && totalEl) {
    container.innerHTML = '';
    if(window.webCart.length === 0) { container.innerHTML = '<p class="text-center text-gray-500 py-8">السلة فارغة حالياً 🛒</p>'; } else {
      window.webCart.forEach(item => {
        totalQty += item.qty; totalPrice += (item.price * item.qty);
        container.innerHTML += `
          <div class="flex justify-between items-center bg-[#10102b] p-3 rounded-xl border border-[rgba(0,212,255,0.1)]">
            <div><h4 class="text-white text-sm font-bold truncate max-w-[160px]">${item.name}</h4><p class="text-cyan-400 text-xs font-black">${item.price} ج.م</p></div>
            <div class="flex items-center gap-3 bg-[#0a0a1f] px-2 py-1 rounded-lg border border-gray-800">
              <button onclick="updateWebCartQty('${item.cartId}', -1)" class="w-6 h-6 text-red-400 font-bold">-</button>
              <span class="text-white font-bold text-sm w-4 text-center">${item.qty}</span>
              <button onclick="updateWebCartQty('${item.cartId}', 1)" class="w-6 h-6 text-green-400 font-bold">+</button>
            </div>
          </div>`;
      });
    }
    badge.textContent = totalQty; totalEl.textContent = totalPrice.toFixed(2) + ' ج.م';
  }
}

window.checkoutWebCart = function() {
  if(window.webCart.length === 0) { showToast("السلة فارغة!", true); return; }
  let msg = "أهلاً Nader Store، أريد تأكيد هذا الطلب:\n\n"; let total = 0;
  window.webCart.forEach((item, index) => { msg += `🛍️ ${index + 1}- ${item.name}\nالكمية: ${item.qty} | السعر: ${item.price * item.qty} ج.م\n\n`; total += (item.price * item.qty); });
  msg += `=================\n💰 الإجمالي المطلوب: ${total.toFixed(2)} ج.م\n\nهل البضاعة متوفرة؟`;
  window.open(`https://wa.me/${GLOBAL_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  window.webCart = []; window.saveWebCart(); document.getElementById('cartModal').classList.remove('open');
}

// ===================== [فتح نافذة التعديل الذكية للمنتج] =====================
window.openEditProductModal = function(prod) {
  document.getElementById('editProdCode').value = prod.code;
  document.getElementById('editProdName').value = prod.name;
  document.getElementById('editProdPrice').value = prod.price;
  document.getElementById('editProdDesc').value = prod.desc;

  const container = document.getElementById('editSizeFieldsContainer');
  container.innerHTML = '';
  const sizeType = (prod.sizes && prod.sizes.type) ? prod.sizes.type : 'none';

  if (sizeType === 'none') {
    container.innerHTML = `
      <label class="block text-xs text-gray-400 mb-1">الكمية الإجمالية المتاحة حالياً</label>
      <input type="number" id="edit_prodStock" class="input-dark text-sm" value="${prod.stock || 0}" min="0">`;
  } else if (sizeType === 'letters') {
    const variants = prod.sizes.variants || [];
    const getQty = (sz) => { const v = variants.find(i => i.size === sz); return v ? v.qty : 0; };
    container.innerHTML = `
      <label class="block text-xs text-gray-400 mb-2">تعديل المخزون لكل مقاس حرفي:</label>
      <div class="flex gap-2 flex-wrap">
        <div class="flex-1 text-center"><span class="text-[10px] text-gray-500 block mb-1">S</span><input type="number" id="edit_qty_S" class="input-dark text-sm p-1 text-center" value="${getQty('S')}" min="0"></div>
        <div class="flex-1 text-center"><span class="text-[10px] text-gray-500 block mb-1">M</span><input type="number" id="edit_qty_M" class="input-dark text-sm p-1 text-center" value="${getQty('M')}" min="0"></div>
        <div class="flex-1 text-center"><span class="text-[10px] text-gray-500 block mb-1">L</span><input type="number" id="edit_qty_L" class="input-dark text-sm p-1 text-center" value="${getQty('L')}" min="0"></div>
        <div class="flex-1 text-center"><span class="text-[10px] text-gray-500 block mb-1">XL</span><input type="number" id="edit_qty_XL" class="input-dark text-sm p-1 text-center" value="${getQty('XL')}" min="0"></div>
        <div class="flex-1 text-center"><span class="text-[10px] text-gray-500 block mb-1">XXL</span><input type="number" id="edit_qty_XXL" class="input-dark text-sm p-1 text-center" value="${getQty('XXL')}" min="0"></div>
      </div>`;
  } else if (sizeType === 'numbers') {
    const variants = prod.sizes.variants || [];
    const str = variants.map(v => `${v.size}:${v.qty}`).join(', ');
    container.innerHTML = `
      <label class="block text-xs text-gray-400 mb-1">تعديل كميات الأرقام (مثال: 41:5, 42:10)</label>
      <input type="text" id="edit_qty_Numbers" class="input-dark text-sm" value="${str}">`;
  }
  document.getElementById('editProductModal').classList.add('open');
}

// تهيئة وإدارة الـ DOM
document.addEventListener("DOMContentLoaded", () => {
  const submitLoginBtn = document.getElementById('submitLoginBtn');
  const addProductSubmitBtn = document.getElementById('addProductSubmitBtn');
  const addMerchantSubmitBtn = document.getElementById('addMerchantSubmitBtn');

  // أزرار سلة المشتريات والتعديل
  document.getElementById('cartBtn')?.addEventListener('click', () => document.getElementById('cartModal')?.classList.add('open'));
  document.getElementById('closeCartBtn')?.addEventListener('click', () => document.getElementById('cartModal')?.classList.remove('open'));
  document.getElementById('checkoutCartBtn')?.addEventListener('click', window.checkoutWebCart);
  document.getElementById('closeEditProductBtn')?.addEventListener('click', () => document.getElementById('editProductModal').classList.remove('open'));

  window.updateWebCartUI();

  document.getElementById('navStore')?.addEventListener('click', () => {
    if(document.getElementById('navStore').innerHTML.includes('لوحة التحكم')) {
      showScreen((auth.currentUser?.email === ADMIN_EMAIL) ? 'admin' : 'merchant');
    } else { showScreen('store'); }
  });

  document.getElementById('navLogin')?.addEventListener('click', () => document.getElementById('loginModal').classList.add('open'));
  document.getElementById('closeLoginBtn')?.addEventListener('click', () => document.getElementById('loginModal').classList.remove('open'));

  if(submitLoginBtn) {
    submitLoginBtn.addEventListener('click', async () => {
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!email || !password) return;
      try {
        submitLoginBtn.textContent = "جاري الدخول...";
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (email !== ADMIN_EMAIL) {
          const docSnap = await getDoc(doc(db, "merchants", userCred.user.uid));
          if (docSnap.exists()) {
            localStorage.setItem('merchantId', userCred.user.uid);
            localStorage.setItem('merchantName', docSnap.data().name);
            currentMerchantId = userCred.user.uid; currentMerchantName = docSnap.data().name;
          }
        }
        document.getElementById('loginModal').classList.remove('open');
        showToast("تم الدخول بنجاح");
      } catch (e) { showToast("خطأ في البيانات", true); } finally { submitLoginBtn.textContent = "دخول ←"; }
    });
  }

  document.getElementById('navLogout')?.addEventListener('click', () => {
    signOut(auth).then(() => { localStorage.clear(); currentMerchantId = null; window.location.reload(); });
  });

  // ===================== [حفظ التعديلات وإرسالها للفايربيز] =====================
  document.getElementById('saveEditProductBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('editProdCode').value;
    const name = document.getElementById('editProdName').value.trim();
    const price = document.getElementById('editProdPrice').value.trim();
    const desc = document.getElementById('editProdDesc').value.trim();

    if(!name || !price || !desc) { showToast("برجاء ملء الحقول المطلوبة", true); return; }

    let stock = 0;
    let sizesData = { type: 'none', variants: [] };

    if (document.getElementById('edit_prodStock')) {
      stock = parseInt(document.getElementById('edit_prodStock').value) || 0;
      sizesData.type = 'none';
    } else if (document.getElementById('edit_qty_S')) {
      const s = parseInt(document.getElementById('edit_qty_S').value) || 0;
      const m = parseInt(document.getElementById('edit_qty_M').value) || 0;
      const l = parseInt(document.getElementById('edit_qty_L').value) || 0;
      const xl = parseInt(document.getElementById('edit_qty_XL').value) || 0;
      const xxl = parseInt(document.getElementById('edit_qty_XXL').value) || 0;

      if(s>0) sizesData.variants.push({size: 'S', qty: s});
      if(m>0) sizesData.variants.push({size: 'M', qty: m});
      if(l>0) sizesData.variants.push({size: 'L', qty: l});
      if(xl>0) sizesData.variants.push({size: 'XL', qty: xl});
      if(xxl>0) sizesData.variants.push({size: 'XXL', qty: xxl});
      stock = s + m + l + xl + xxl; sizesData.type = 'letters';
    } else if (document.getElementById('edit_qty_Numbers')) {
      const val = document.getElementById('edit_qty_Numbers').value.trim();
      if(val) {
        val.split(',').forEach(pair => {
          const parts = pair.split(':');
          if(parts.length === 2) {
            const sz = parts[0].trim(), qt = parseInt(parts[1].trim()) || 0;
            if(sz && qt > 0) { sizesData.variants.push({size: sz, qty: qt}); stock += qt; }
          }
        });
      }
      sizesData.type = 'numbers';
    }

    try {
      document.getElementById('saveEditProductBtn').textContent = "جاري التحديث...";
      await setDoc(doc(db, "products", code), {
        name: name, price: price.toString(), desc: desc, stock: stock.toString(), sizes: sizesData
      }, { merge: true });

      showToast("تم تحديث بضاعة الصنف والمخزون بنجاح ✓");
      document.getElementById('editProductModal').classList.remove('open');
    } catch(e) { showToast("فشل تحديث المنتج", true); } finally { document.getElementById('saveEditProductBtn').textContent = "حفظ التغييرات وتحديث السيرفر ✓"; }
  });

  // إضافة منتج جديد
  if(addProductSubmitBtn) {
    addProductSubmitBtn.addEventListener('click', async () => {
      const name = document.getElementById('newProductName').value.trim();
      const price = document.getElementById('newProductPrice').value.trim();
      const desc = document.getElementById('newProductDesc').value.trim();
      const img = document.getElementById('newProductImage').value.trim() || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500";
      if (!name || !price || !desc) { showToast("يرجى ملء الحقول الإلزامية *", true); return; }

      let stock = 0; let sizesData = { type: 'none', variants: [] };
      const sizeType = document.getElementById('newProductSizeType').value;

      if (sizeType === 'none') { stock = parseInt(document.getElementById('newProductStock').value) || 0; } 
      else if (sizeType === 'letters') {
          const s = parseInt(document.getElementById('qty_S').value) || 0, m = parseInt(document.getElementById('qty_M').value) || 0, l = parseInt(document.getElementById('qty_L').value) || 0, xl = parseInt(document.getElementById('qty_XL').value) || 0, xxl = parseInt(document.getElementById('qty_XXL').value) || 0;
          if(s>0) sizesData.variants.push({size: 'S', qty: s}); if(m>0) sizesData.variants.push({size: 'M', qty: m}); if(l>0) sizesData.variants.push({size: 'L', qty: l}); if(xl>0) sizesData.variants.push({size: 'XL', qty: xl}); if(xxl>0) sizesData.variants.push({size: 'XXL', qty: xxl});
          stock = s + m + l + xl + xxl; sizesData.type = 'letters';
      } else if (sizeType === 'numbers') {
          const val = document.getElementById('qty_Numbers').value.trim();
          if(val) {
              val.split(',').forEach(pair => { const parts = pair.split(':'); if(parts.length === 2) { const sz = parts[0].trim(), qt = parseInt(parts[1].trim()) || 0; if(sz && qt > 0) { sizesData.variants.push({size: sz, qty: qt}); stock += qt; } } });
          }
          sizesData.type = 'numbers';
      }
      if (stock === 0) { showToast("يجب إدخال كمية صحيحة", true); return; }

      try {
        addProductSubmitBtn.textContent = "جاري الرفع..."; const productCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        const secureMerchantId = auth.currentUser ? auth.currentUser.uid : (currentMerchantId || "offline_vendor");
        const secureMerchantName = currentMerchantName || "تاجر نادر ستور";

        await setDoc(doc(db, "products", productCode), {
          code: productCode, name: name, price: price.toString(), desc: desc, img: img, stock: stock.toString(), sizes: sizesData, syncToWeb: true, merchantId: secureMerchantId, merchantName: secureMerchantName, merchantWhatsapp: GLOBAL_WHATSAPP, createdAt: new Date().toISOString()
        });
        showToast("تم حفظ المنتج ومقاساته بنجاح 🎉");
        document.getElementById('newProductName').value = ''; document.getElementById('newProductPrice').value = ''; document.getElementById('newProductDesc').value = ''; document.getElementById('qty_Numbers').value = '';
        ['S','M','L','XL','XXL'].forEach(l => document.getElementById('qty_'+l).value = '0');
      } catch (error) { showToast("فشل إضافة المنتج", true); } finally { addProductSubmitBtn.textContent = "حفظ وإضافة للمتجر 🚀"; }
    });
  }
});

onAuthStateChanged(auth, async (user) => {
  const navLogin = document.getElementById('navLogin'), navLogout = document.getElementById('navLogout'), navStore = document.getElementById('navStore'), userBadge = document.getElementById('userBadge');
  if (user) {
    if(navLogin) navLogin.classList.add('hidden'); if(navLogout) navLogout.classList.remove('hidden'); if(navStore) navStore.classList.remove('hidden'); if(userBadge) userBadge.classList.remove('hidden');
    if (user.email === ADMIN_EMAIL) { if(userBadge) userBadge.textContent = "أدمن"; showScreen('admin'); } else { if(userBadge) userBadge.textContent = currentMerchantName; showScreen('merchant'); listenToMerchantProducts(user.uid); }
  } else { currentMerchantId = null; showScreen('store'); }
});

// ===================== [دالة مراقبة وعرض منتجات التاجر مع زر التعديل الجديد] =====================
function listenToMerchantProducts(merchantId) {
  const q = query(collection(db, "products"), where("merchantId", "==", merchantId));
  const list = document.getElementById('merchantProductsList');
  if(!list) return;

  onSnapshot(q, (snapshot) => {
    list.innerHTML = ''; let count = 0;
    snapshot.forEach((docSnap) => {
      count++; const data = docSnap.data();
      const div = document.createElement('div');
      div.className = "flex items-center justify-between p-3 border-b border-gray-800/50 hover:bg-white/5 rounded-lg mb-2 flex-wrap gap-2";
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <img src="${data.img}" class="w-12 h-12 rounded object-cover border border-cyan-500/20">
          <div>
            <h4 class="text-white text-sm font-bold">${data.name}</h4>
            <p class="text-cyan-400 text-xs">${data.price} ج.م (المخزون الإجمالي: ${data.stock} قطعة)</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="text-yellow-400 hover:text-yellow-300 text-xs p-1 px-2 border border-yellow-400/20 rounded bg-yellow-400/5 btn-edit-prod"><i class="fa-solid fa-pen"></i> تعديل</button>
          <button class="text-red-400 hover:text-red-500 text-xs p-1 px-2 border border-red-400/20 rounded bg-red-400/5 btn-del-prod">✕ حذف</button>
        </div>`;

      div.querySelector('.btn-edit-prod').addEventListener('click', () => window.openEditProductModal(data));
      div.querySelector('.btn-del-prod').addEventListener('click', async () => {
        if(confirm("هل تريد حذف هذا المنتج؟")) { await deleteDoc(doc(db, "products", docSnap.id)); showToast("تم حذف المنتج"); }
      });
      list.appendChild(div);
    });
    if(document.getElementById('merchantProductCount')) document.getElementById('merchantProductCount').textContent = count;
  });
}

// مراقبة المعرض العام للزبائن
let allProducts = [];
onSnapshot(query(collection(db, "products"), where("syncToWeb", "==", true)), (snapshot) => {
  allProducts = []; snapshot.forEach(docSnap => { allProducts.push({ id: docSnap.id, ...docSnap.data() }); });
  renderProductsList(allProducts);
});

function renderProductsList(products) {
  const grid = document.getElementById('productsGrid'), noProducts = document.getElementById('noProducts');
  if(!grid) return; grid.innerHTML = '';
  if (products.length === 0) { if(noProducts) noProducts.classList.remove('hidden'); return; }
  if(noProducts) noProducts.classList.add('hidden');

  products.forEach(p => {
    const card = document.createElement('div'); card.className = "card-glass rounded-2xl overflow-hidden shadow-lg flex flex-col";
    const safeName = p.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
    
    let sizeSelectorHtml = ''; let hasSizes = false;
    if (p.sizes && p.sizes.type !== 'none' && p.sizes.variants && p.sizes.variants.length > 0) {
        hasSizes = true;
        sizeSelectorHtml = `<select id="sizeSelect_${p.id}" class="w-full bg-[#1a1a4a] text-white border border-cyan-500/30 rounded-lg text-xs mb-3 p-2 outline-none focus:border-cyan-400"><option value="" disabled selected>📌 اختر المقاس المناسب...</option>${p.sizes.variants.map(v => `<option value="${v.size}">مقاس ${v.size} (${v.qty} متاح)</option>`).join('')}</select>`;
    }

    card.innerHTML = `
      <div class="relative aspect-square overflow-hidden bg-slate-900"><img src="${p.img}" class="w-full h-full object-cover"></div>
      <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between mb-1">
             <h3 class="font-bold text-lg text-white truncate max-w-[150px]">${p.name}</h3>
             <span class="text-xs text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded-md">🏪 ${p.merchantName || 'الستور'}</span>
          </div>
          <p class="text-gray-400 text-xs line-clamp-2 mt-2 leading-relaxed">${p.desc}</p>
        </div>
        <div class="border-t border-gray-800 pt-3">
          ${sizeSelectorHtml}
          <div class="flex justify-between items-center mb-3"><p class="text-xl font-black text-cyan-400">${p.price} ج.م</p></div>
          <button onclick="addToWebCart('${p.id}', '${safeName}', ${p.price}, ${hasSizes})" class="btn-primary w-full text-center block text-sm flex justify-center items-center gap-2"><i class="fa-solid fa-cart-shopping"></i> أضف للسلة</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

// البحث السريع
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  const word = e.target.value.toLowerCase().trim();
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(word) || p.desc.toLowerCase().includes(word));
  renderProductsList(filtered);
});
