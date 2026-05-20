// 1. استدعاء دوال Firebase الأساسية من الـ CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. كود الـ Config الحقيقي بتاعك
const firebaseConfig = {
  apiKey: "AIzaSyBl8zJSJ_mW36eFQ7UajCMKgYsAEPDMezs",
  authDomain: "nader-store-39cde.firebaseapp.com",
  projectId: "nader-store-39cde",
  storageBucket: "nader-store-39cde.firebasestorage.app",
  messagingSenderId: "1054720474892",
  appId: "1:1054720474892:web:1a9674a45893bb8189d329"
};

// تشغيل التطبيق الرئيسي
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔥 إنشاء تطبيق فرعي مخصص لتسجيل التجار بدون إخراج الأدمن
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
const secondaryAuth = getAuth(secondaryApp);

const ADMIN_EMAIL = "admin@naderstore.com";

// الرقم الموحد لجميع التجار والمنتجات
const GLOBAL_WHATSAPP = "201015409872";

// متغيرات محلية لجلسة التاجر
let currentMerchantId = localStorage.getItem('merchantId') || null;
let currentMerchantName = localStorage.getItem('merchantName') || "تاجر نادر ستور";

// دالة إظهار التنبيهات (Toast)
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if(t) {
    t.textContent = msg;
    t.className = 'toast' + (isError ? ' error' : '');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }
}

// نظام التنقل بين الشاشات
function showScreen(screenName) {
  const screens = {
    store: document.getElementById('screenStore'),
    admin: document.getElementById('screenAdmin'),
    merchant: document.getElementById('screenMerchant')
  };
  const navActions = document.getElementById('navActions');

  Object.keys(screens).forEach(key => {
    if(screens[key]) screens[key].classList.remove('active');
  });
  
  if(screens[screenName]) screens[screenName].classList.add('active');
  if(navActions) navActions.classList.remove('mobile-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// تجهيز الأزرار والـ Forms عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
  
  const navLogin = document.getElementById('navLogin');
  const navStore = document.getElementById('navStore');
  const navLogout = document.getElementById('navLogout');
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const navActions = document.getElementById('navActions');
  const loginModal = document.getElementById('loginModal');
  const closeLoginBtn = document.getElementById('closeLoginBtn');
  const submitLoginBtn = document.getElementById('submitLoginBtn');
  const addProductSubmitBtn = document.getElementById('addProductSubmitBtn');
  const addMerchantSubmitBtn = document.getElementById('addMerchantSubmitBtn');

  // فتح نافذة تسجيل الدخول
  if(navLogin) {
    navLogin.addEventListener('click', () => {
      if(loginModal) {
        loginModal.classList.add('open');
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').classList.add('hidden');
      }
    });
  }

  if(closeLoginBtn) closeLoginBtn.addEventListener('click', () => loginModal.classList.remove('open'));
  if(navStore) navStore.addEventListener('click', () => showScreen('store'));
  if(hamburgerMenu && navActions) hamburgerMenu.addEventListener('click', () => navActions.classList.toggle('mobile-open'));

  // تنفيذ الدخول
  if(submitLoginBtn) {
    submitLoginBtn.addEventListener('click', async () => {
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const loginError = document.getElementById('loginError');

      if (!email || !password) {
        loginError.textContent = "يرجى ملء جميع الحقول";
        loginError.classList.remove('hidden');
        return;
      }

      try {
        submitLoginBtn.disabled = true;
        submitLoginBtn.textContent = "جاري الدخول...";
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (email !== ADMIN_EMAIL) {
          const docRef = doc(db, "merchants", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('merchantId', user.uid);
            localStorage.setItem('merchantName', data.name);
            currentMerchantId = user.uid;
            currentMerchantName = data.name;
          } else {
            localStorage.setItem('merchantId', user.uid);
            currentMerchantId = user.uid;
          }
        }

        loginModal.classList.remove('open');
        showToast("تم تسجيل الدخول بنجاح ✓");
      } catch (error) {
        console.error(error);
        loginError.textContent = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
        loginError.classList.remove('hidden');
      } finally {
        submitLoginBtn.disabled = false;
        submitLoginBtn.textContent = "دخول ←";
      }
    });
  }

  // تسجيل الخروج
  if(navLogout) {
    navLogout.addEventListener('click', () => {
      signOut(auth).then(() => {
        localStorage.clear();
        currentMerchantId = null;
        showToast("تم تسجيل الخروج بنجاح");
      });
    });
  }

  // ===================== [إضافة تاجر جديد] =====================
  if(addMerchantSubmitBtn) {
    addMerchantSubmitBtn.addEventListener('click', async () => {
      const name = document.getElementById('newMerchantName').value.trim();
      const email = document.getElementById('newMerchantEmail').value.trim();
      const password = document.getElementById('newMerchantPassword').value;

      if (!name || !email || !password) {
        showToast("يرجى ملء جميع حقول التاجر *", true);
        return;
      }

      try {
        addMerchantSubmitBtn.disabled = true;
        addMerchantSubmitBtn.textContent = "جاري إنشاء الحساب...";

        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newMerchantUser = userCredential.user;
        const merchantUid = newMerchantUser.uid;

        await setDoc(doc(db, "merchants", merchantUid), {
          id: merchantUid,
          name: name,
          email: email,
          password: password,
          whatsapp: GLOBAL_WHATSAPP,
          createdAt: new Date().toISOString()
        });

        await signOut(secondaryAuth);
        showToast(`تم إنشاء حساب التاجر (${name}) بنجاح وبشكل تلقائي! 🎉`);
        
        document.getElementById('newMerchantName').value = '';
        document.getElementById('newMerchantEmail').value = '';
        document.getElementById('newMerchantPassword').value = '';

      } catch (error) {
        console.error("خطأ إنشاء التاجر:", error);
        if(error.code === 'auth/email-already-in-use') {
          showToast("هذا الإيميل مسجل بالفعل في فايربيز!", true);
        } else {
          showToast("فشل إضافة التاجر، راجع الـ Console أو الـ Rules", true);
        }
      } finally {
        addMerchantSubmitBtn.disabled = false;
        addMerchantSubmitBtn.textContent = "إضافة التاجر ←";
      }
    });
  }

  // ===================== [إضافة منتج جديد متوافق وسحابي 100%] =====================
  if(addProductSubmitBtn) {
    addProductSubmitBtn.addEventListener('click', async () => {
      const name = document.getElementById('newProductName').value.trim();
      const price = document.getElementById('newProductPrice').value.trim();
      const desc = document.getElementById('newProductDesc').value.trim();
      const img = document.getElementById('newProductImage').value.trim() || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500";
      const stock = document.getElementById('newProductStock').value || "1";

      if (!name || !price || !desc) {
        showToast("يرجى ملء جميع الحقول النجمية *", true);
        return;
      }

      const mId = currentMerchantId || (auth.currentUser ? auth.currentUser.uid : "offline_vendor");

      try {
        addProductSubmitBtn.disabled = true;
        addProductSubmitBtn.textContent = "جاري الرفع...";

        // 🎯 توليد كود موحد عبارة عن 8 أرقام فقط (بدون حروف) لسهولة الاستخدام كباركود
        const productCode = Math.floor(10000000 + Math.random() * 90000000).toString();

        // 🎯 التعديل الجوهري: استخدام setDoc لتثبيت معرّف الكود، وإضافة الختم السحابي ليظهر في الموقع
        await setDoc(doc(db, "products", productCode), {
          code: productCode,
          name: name,
          price: price.toString(),
          desc: desc,
          img: img,
          stock: stock.toString(),
          syncToWeb: true, // تفعيل الختم إجبارياً ليظهر فوراً في معرض الموقع
          merchantId: mId,
          merchantName: currentMerchantName,
          merchantWhatsapp: GLOBAL_WHATSAPP, 
          createdAt: new Date().toISOString()
        });

        showToast("تم عرض المنتج في الاستور بنجاح 🎉");
        
        document.getElementById('newProductName').value = '';
        document.getElementById('newProductPrice').value = '';
        document.getElementById('newProductDesc').value = '';
        document.getElementById('newProductImage').value = '';
        document.getElementById('newProductStock').value = '';

      } catch (error) {
        console.error(error);
        showToast("فشل إضافة المنتج", true);
      } finally {
        addProductSubmitBtn.disabled = false;
        addProductSubmitBtn.textContent = "إضافة المنتج ←";
      }
    });
  }
});

// مراقبة حالة المستخدم والتبديل بين الشاشات
onAuthStateChanged(auth, async (user) => {
  const navLogin = document.getElementById('navLogin');
  const navLogout = document.getElementById('navLogout');
  const navStore = document.getElementById('navStore');
  const userBadge = document.getElementById('userBadge');

  if (user) {
    if(navLogin) navLogin.classList.add('hidden');
    if(navLogout) navLogout.classList.remove('hidden');
    if(navStore) navStore.classList.remove('hidden');
    if(userBadge) userBadge.classList.remove('hidden');

    if (user.email === ADMIN_EMAIL) {
      if(userBadge) {
        userBadge.textContent = "نادر (الأدمن)";
        userBadge.className = "badge badge-purple text-xs";
      }
      showScreen('admin');
      listenToMerchants();
    } else {
      if(!currentMerchantId) {
        const docRef = doc(db, "merchants", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          currentMerchantId = user.uid;
          currentMerchantName = data.name;
        }
      }
      if(userBadge) {
        userBadge.textContent = currentMerchantName;
        userBadge.className = "badge badge-green text-xs";
      }
      if(document.getElementById('merchantWelcome')) {
        document.getElementById('merchantWelcome').textContent = `لوحة تحكم التاجر: ${currentMerchantName}`;
      }
      showScreen('merchant');
      listenToMerchantProducts(user.uid);
    }
  } else {
    currentMerchantId = null;
    if(navLogin) navLogin.classList.remove('hidden');
    if(navLogout) navLogout.classList.add('hidden');
    if(navStore) navStore.classList.remove('hidden');
    if(userBadge) userBadge.classList.add('hidden');
    showScreen('store');
  }
});

// دالة مراقبة التجار للأدمن
function listenToMerchants() {
  const tableBody = document.getElementById('merchantsBody');
  const noMerchants = document.getElementById('noMerchants');
  const statMerchants = document.getElementById('statMerchants');

  onSnapshot(collection(db, "merchants"), (snapshot) => {
    if(!tableBody) return;
    tableBody.innerHTML = '';
    let count = 0;
    
    snapshot.forEach((docSnap) => {
      count++;
      const data = docSnap.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${count}</td>
        <td class="font-bold text-white">${data.name}</td>
        <td>${data.email}</td>
        <td><span class="badge badge-blue">${GLOBAL_WHATSAPP}</span></td>
        <td>-</td>
        <td><span class="badge badge-green">نشط</span></td>
        <td><button class="btn-danger text-xs p-1 px-3 rounded">حذف</button></td>
      `;
      
      tr.querySelector('.btn-danger').addEventListener('click', async () => {
        if(confirm(`هل تريد حذف التاجر ${data.name}؟`)) {
          await deleteDoc(doc(db, "merchants", docSnap.id));
          showToast("تم حذف التاجر");
        }
      });
      tableBody.appendChild(tr);
    });

    if(statMerchants) statMerchants.textContent = count;
    if(noMerchants) {
      if (count === 0) noMerchants.classList.remove('hidden');
      else noMerchants.classList.add('hidden');
    }
  });
}

// دالة مراقبة منتجات التاجر
function listenToMerchantProducts(merchantId) {
  const q = query(collection(db, "products"), where("merchantId", "==", merchantId));
  const list = document.getElementById('merchantProductsList');
  const mCount = document.getElementById('merchantProductCount');

  onSnapshot(q, (snapshot) => {
    if(!list) return;
    list.innerHTML = '';
    let count = 0;
    
    snapshot.forEach((docSnap) => {
      count++;
      const data = docSnap.data();
      const div = document.createElement('div');
      div.className = "flex items-center justify-between p-3 border-b border-gray-800/50 hover:bg-white/5 rounded-lg mb-2";
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <img src="${data.img}" class="w-12 h-12 rounded object-cover border border-cyan-500/20">
          <div>
            <h4 class="text-white text-sm font-bold">${data.name}</h4>
            <p class="text-cyan-400 text-xs">${data.price} ج.م</p>
          </div>
        </div>
        <button class="text-red-400 hover:text-red-500 text-xs p-1">✕ حذف</button>
      `;

      div.querySelector('button').addEventListener('click', async () => {
        if(confirm("هل تريد حذف هذا المنتج؟")) {
          await deleteDoc(doc(db, "products", docSnap.id));
          showToast("تم حذف المنتج");
        }
      });
      list.appendChild(div);
    });
    if(mCount) mCount.textContent = count;
  });
}

// مراقبة المنتجات والمعرض العام مع الفلتر السحابي
let allProducts = [];
const webProductsQuery = query(collection(db, "products"), where("syncToWeb", "==", true));

onSnapshot(webProductsQuery, (snapshot) => {
  allProducts = [];
  snapshot.forEach(docSnap => {
    allProducts.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderProductsList(allProducts);
});

function renderProductsList(products) {
  const grid = document.getElementById('productsGrid');
  const countBadge = document.getElementById('productCount');
  const noProducts = document.getElementById('noProducts');

  if(!grid) return;
  grid.innerHTML = '';
  if(countBadge) countBadge.textContent = `${products.length} منتج`;

  if (products.length === 0) {
    if(noProducts) noProducts.classList.remove('hidden');
    return;
  }
  if(noProducts) noProducts.classList.add('hidden');

  products.forEach(p => {
    const card = document.createElement('div');
    card.className = "card-glass rounded-2xl overflow-hidden shadow-lg flex flex-col";
    
    const whatsappMessage = encodeURIComponent(`أهلاً، أريد شراء منتج: ${p.name} المعروض على Nader Store بسعر ${p.price} ج.م`);
    
    card.innerHTML = `
      <div class="relative aspect-square overflow-hidden bg-slate-900">
        <img src="${p.img}" class="w-full h-full object-cover">
      </div>
      <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between mb-1">
             <h3 class="font-bold text-lg text-white">${p.name}</h3>
             <span class="text-xs text-purple-400">🏪 ${p.merchantName || 'الستور'}</span>
          </div>
          <p class="text-gray-400 text-sm line-clamp-2">${p.desc}</p>
        </div>
        <div>
          <p class="text-xl font-black text-cyan-400 mb-2">${p.price} ج.م</p>
          <a href="https://wa.me/${GLOBAL_WHATSAPP}?text=${whatsappMessage}" target="_blank" class="btn-whatsapp text-center block">طلب عبر واتساب</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// البحث السريع
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById('searchInput');
  if(searchInput) {
    searchInput.addEventListener('input', (e) => {
      const word = e.target.value.toLowerCase().trim();
      const filtered = allProducts.filter(p => p.name.toLowerCase().includes(word) || p.desc.toLowerCase().includes(word));
      renderProductsList(filtered);
    });
  }
});
