import { supabase, WHATSAPP_NUMBER } from "./supabase-config.js";

/* ============================================================
   i18n
   ============================================================ */
const I18N = {
  ar: {
    brand:"ابن مالك", search_ph:"ابحث عن عسل، طحينة، شوفان…", login:"تسجيل الدخول",
    eyebrow:"طبيعي 100% · من المزرعة للبيت", hero_title:"جودة تستحق مطبخك",
    hero_sub:"عسل نحل طبيعي، طحينة نقية، زبدة فول سوداني وشوفان — تصل لباب بيتك في كل المحافظات، والدفع عند الاستلام.",
    cta_shop:"تسوق الآن", cta_best:"الأكثر مبيعًا", featured_title:"منتجات مختارة",
    best_title:"الأكثر مبيعًا", shop_title:"كل المنتجات", filter_cat:"الفئة",
    filter_offers:"العروض", filter_discount_only:"عرض المنتجات المخفضة فقط",
    no_products:"لا توجد منتجات مطابقة", footer_tag:"منتجات غذائية طبيعية فاخرة",
    footer_contact:"تواصل معنا", cart_title:"سلة المشتريات", total:"الإجمالي",
    checkout:"إتمام الطلب", wishlist_title:"المفضلة", checkout_title:"بيانات التوصيل",
    full_name:"الاسم بالكامل", phone:"رقم الهاتف", governorate:"المحافظة",
    address:"العنوان بالتفصيل", notes:"ملاحظات (اختياري)", payment:"طريقة الدفع",
    cod:"الدفع عند الاستلام", confirm_order:"تأكيد الطلب", login_title:"تسجيل الدخول",
    google_login:"الدخول بحساب Google", login_note:"تسجيل الدخول اختياري — يمكنك تسجيل الطلب كزائر أيضًا.",
    order_received:"تم استلام طلبك 🎉", order_number_label:"رقم الطلب:",
    order_followup:"هنتواصل معك لتأكيد الطلب. تقدر كمان تبعت الطلب على واتساب.", close:"إغلاق",
    add_to_cart:"أضف للسلة", out_of_stock:"غير متوفر", cart_empty:"سلتك فارغة",
    wish_empty:"لا يوجد عناصر في المفضلة", added_to_cart:"تمت الإضافة للسلة",
    added_to_wish:"أضيف للمفضلة", removed_from_wish:"أُزيل من المفضلة", logged_in:"تم تسجيل الدخول",
    logout:"تسجيل الخروج", all_categories:"الكل"
  },
  en: {
    brand:"Ibn Malik", search_ph:"Search honey, tahini, oats…", login:"Log in",
    eyebrow:"100% natural · farm to home", hero_title:"Quality your kitchen deserves",
    hero_sub:"Natural honey, pure tahini, peanut butter and oats — delivered nationwide, cash on delivery.",
    cta_shop:"Shop now", cta_best:"Best sellers", featured_title:"Featured products",
    best_title:"Best sellers", shop_title:"All products", filter_cat:"Category",
    filter_offers:"Offers", filter_discount_only:"Show discounted only",
    no_products:"No matching products", footer_tag:"Premium natural pantry staples",
    footer_contact:"Contact us", cart_title:"Shopping cart", total:"Total",
    checkout:"Checkout", wishlist_title:"Wishlist", checkout_title:"Delivery details",
    full_name:"Full name", phone:"Phone number", governorate:"Governorate",
    address:"Detailed address", notes:"Notes (optional)", payment:"Payment method",
    cod:"Cash on delivery", confirm_order:"Confirm order", login_title:"Log in",
    google_login:"Continue with Google", login_note:"Login is optional — you can also check out as a guest.",
    order_received:"Order received 🎉", order_number_label:"Order number:",
    order_followup:"We'll contact you to confirm. You can also share it on WhatsApp.", close:"Close",
    add_to_cart:"Add to cart", out_of_stock:"Out of stock", cart_empty:"Your cart is empty",
    wish_empty:"No items in your wishlist", added_to_cart:"Added to cart",
    added_to_wish:"Added to wishlist", removed_from_wish:"Removed from wishlist", logged_in:"Logged in",
    logout:"Log out", all_categories:"All"
  }
};

const GOVERNORATES = ["القاهرة","الجيزة","الإسكندرية","الدقهلية","الشرقية","المنوفية","القليوبية",
  "البحيرة","الغربية","بورسعيد","دمياط","الإسماعيلية","السويس","كفر الشيخ","الفيوم","بني سويف",
  "المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح",
  "شمال سيناء","جنوب سيناء"];

const CATEGORY_ICONS = {honey:"🍯","peanut-butter":"🥜",tahini:"🌰",oats:"🥣"};

let lang = localStorage.getItem("im_lang") || "ar";
let categories = [];
let products = [];
let discounts = [];
let cart = JSON.parse(localStorage.getItem("im_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("im_wishlist") || "[]");
let activeCategory = null;
let currentUser = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const t = (key) => I18N[lang][key] || key;
const money = (n) => lang === "ar" ? `${Number(n).toFixed(2)} ج.م` : `EGP ${Number(n).toFixed(2)}`;

/* ============================================================
   i18n rendering
   ============================================================ */
function applyI18n(){
  document.documentElement.lang = lang === "ar" ? "ar" : "en";
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $("#langToggle").textContent = lang === "ar" ? "EN" : "AR";
  $$("[data-i18n]").forEach(el => el.textContent = t(el.dataset.i18n));
  $$("[data-i18n-ph]").forEach(el => el.placeholder = t(el.dataset.i18nPh));
  $$("[data-i18n-val]").forEach(el => el.value = t(el.dataset.i18nVal));
  $("#governorateSelect").innerHTML = GOVERNORATES.map(g => `<option>${g}</option>`).join("");
}
$("#langToggle").addEventListener("click", () => {
  lang = lang === "ar" ? "en" : "ar";
  localStorage.setItem("im_lang", lang);
  applyI18n();
  renderAll();
});

/* ============================================================
   Data loading
   ============================================================ */
async function loadData(){
  const [{data: cats}, {data: prods}, {data: discs}] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("*").eq("status","active"),
    supabase.from("discounts").select("*").eq("active", true)
  ]);
  categories = cats || [];
  products = prods || [];
  discounts = discs || [];
  renderAll();
}

function effectivePrice(p){
  let price = p.sale_price ?? p.price;
  for(const d of discounts){
    const applies = d.applies_to === "all" ||
      (d.applies_to === "category" && d.target_id === p.category_id) ||
      (d.applies_to === "product" && d.target_id === p.id);
    if(!applies) continue;
    if(d.starts_at && new Date(d.starts_at) > new Date()) continue;
    if(d.ends_at && new Date(d.ends_at) < new Date()) continue;
    price = d.type === "percentage" ? price * (1 - d.value/100) : Math.max(0, price - d.value);
  }
  return Math.round(price * 100) / 100;
}

function hasDiscount(p){ return effectivePrice(p) < p.price; }

/* ============================================================
   Rendering
   ============================================================ */
function renderAll(){
  renderCategoryShelf();
  renderFilterCategories();
  renderHeroTickets();
  renderGrid("#featuredGrid", products.filter(p => p.is_featured));
  renderGrid("#bestGrid", products.filter(p => p.is_best_seller));
  renderShopGrid();
  updateCounts();
}

function renderCategoryShelf(){
  const html = [`<button class="category-jar${!activeCategory?" active":""}" data-cat=""><span class="jar-shape">🛒</span><span>${t("all_categories")}</span></button>`]
    .concat(categories.map(c => `
      <button class="category-jar${activeCategory===c.id?" active":""}" data-cat="${c.id}">
        <span class="jar-shape">${CATEGORY_ICONS[c.slug] || "🫙"}</span>
        <span>${lang==="ar"?c.name_ar:c.name_en}</span>
      </button>`));
  $("#categoryShelf").innerHTML = html.join("");
  $$("#categoryShelf .category-jar").forEach(btn => btn.addEventListener("click", () => {
    activeCategory = btn.dataset.cat || null;
    renderCategoryShelf(); renderShopGrid();
    document.getElementById("shop").scrollIntoView({behavior:"smooth"});
  }));
}

function renderFilterCategories(){
  $("#filterCategories").innerHTML = categories.map(c => `
    <label><input type="checkbox" class="cat-filter" value="${c.id}" ${activeCategory===c.id?"checked":""}>
      ${lang==="ar"?c.name_ar:c.name_en}</label>`).join("");
  $$(".cat-filter").forEach(cb => cb.addEventListener("change", () => {
    const checked = [...$$(".cat-filter")].filter(c=>c.checked).map(c=>c.value);
    activeCategory = checked[checked.length-1] || null;
    renderCategoryShelf(); renderShopGrid();
  }));
}

function renderHeroTickets(){
  const picks = products.slice(0,3);
  $("#heroTickets").innerHTML = picks.map(p => `
    <div class="price-ticket">
      <div style="font-size:2.2rem;text-align:center">${CATEGORY_ICONS[categories.find(c=>c.id===p.category_id)?.slug] || "🫙"}</div>
      <div class="tname">${lang==="ar"?p.name_ar:p.name_en}</div>
      <div class="tprice">${money(effectivePrice(p))}</div>
    </div>`).join("");
}

function productCard(p){
  const name = lang === "ar" ? p.name_ar : p.name_en;
  const catSlug = categories.find(c => c.id === p.category_id)?.slug;
  const icon = CATEGORY_ICONS[catSlug] || "🫙";
  const price = effectivePrice(p);
  const discounted = hasDiscount(p);
  const inWish = wishlist.includes(p.id);
  const outOfStock = p.stock <= 0;
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="thumb">
        ${discounted ? `<span class="badge">${lang==="ar"?"خصم":"Sale"}</span>` : ""}
        <button class="wish-btn ${inWish?"active":""}" data-wish="${p.id}" aria-label="wishlist">${inWish?"♥":"♡"}</button>
        <span style="font-size:2.6rem">${icon}</span>
      </div>
      <div class="product-body">
        <div class="pcat">${catSlug ? (lang==="ar"?categories.find(c=>c.id===p.category_id).name_ar:categories.find(c=>c.id===p.category_id).name_en) : ""}</div>
        <div class="pname">${name}</div>
        <div class="price-row">
          <span class="price-now">${money(price)}</span>
          ${discounted ? `<span class="price-old">${money(p.price)}</span>` : ""}
        </div>
        <button class="add-cart-btn" data-add="${p.id}" ${outOfStock?"disabled":""}>
          ${outOfStock ? t("out_of_stock") : t("add_to_cart")}
        </button>
      </div>
    </div>`;
}

function renderGrid(sel, list){
  $(sel).innerHTML = list.map(productCard).join("") || `<p class="empty-state">${t("no_products")}</p>`;
  bindCardEvents(sel);
}

function renderShopGrid(){
  const discountOnly = $("#filterDiscountOnly").checked;
  const query = $("#searchInput").value.trim().toLowerCase();
  let list = products.filter(p => {
    if(activeCategory && p.category_id !== activeCategory) return false;
    if(discountOnly && !hasDiscount(p)) return false;
    if(query){
      const hay = `${p.name_ar} ${p.name_en} ${p.short_description_ar||""} ${p.short_description_en||""}`.toLowerCase();
      if(!hay.includes(query)) return false;
    }
    return true;
  });
  $("#allProductsGrid").innerHTML = list.map(productCard).join("");
  $("#emptyState").hidden = list.length !== 0;
  bindCardEvents("#allProductsGrid");
}

function bindCardEvents(sel){
  $(sel).querySelectorAll("[data-add]").forEach(btn => btn.addEventListener("click", () => addToCart(btn.dataset.add)));
  $(sel).querySelectorAll("[data-wish]").forEach(btn => btn.addEventListener("click", () => toggleWish(btn.dataset.wish)));
}

$("#searchInput").addEventListener("input", renderShopGrid);
$("#filterDiscountOnly").addEventListener("change", renderShopGrid);

/* ============================================================
   Cart
   ============================================================ */
function saveCart(){ localStorage.setItem("im_cart", JSON.stringify(cart)); updateCounts(); renderCartDrawer(); }
function saveWishlist(){ localStorage.setItem("im_wishlist", JSON.stringify(wishlist)); updateCounts(); renderWishDrawer(); renderAll(); }

function addToCart(productId){
  const line = cart.find(l => l.id === productId);
  if(line) line.qty += 1; else cart.push({id: productId, qty: 1});
  saveCart();
  showToast(t("added_to_cart"));
}
function toggleWish(productId){
  if(wishlist.includes(productId)){
    wishlist = wishlist.filter(id => id !== productId);
    showToast(t("removed_from_wish"));
  } else {
    wishlist.push(productId);
    showToast(t("added_to_wish"));
  }
  saveWishlist();
}
function updateCounts(){
  const cartQty = cart.reduce((s,l)=>s+l.qty,0);
  $("#cartCount").hidden = cartQty === 0; $("#cartCount").textContent = cartQty;
  $("#wishCount").hidden = wishlist.length === 0; $("#wishCount").textContent = wishlist.length;
}

function renderCartDrawer(){
  if(cart.length === 0){
    $("#cartBody").innerHTML = `<p class="empty-state">${t("cart_empty")}</p>`;
    $("#cartTotal").textContent = money(0);
    return;
  }
  let total = 0;
  $("#cartBody").innerHTML = cart.map(line => {
    const p = products.find(pp => pp.id === line.id);
    if(!p) return "";
    const price = effectivePrice(p);
    total += price * line.qty;
    const catSlug = categories.find(c=>c.id===p.category_id)?.slug;
    return `
      <div class="cart-line" data-line="${line.id}">
        <div class="thumb-sm">${CATEGORY_ICONS[catSlug]||"🫙"}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:.9rem">${lang==="ar"?p.name_ar:p.name_en}</div>
          <div class="qty-stepper">
            <button data-dec="${p.id}">−</button><span>${line.qty}</span><button data-inc="${p.id}">+</button>
          </div>
          <button class="remove-link" data-remove="${p.id}">${lang==="ar"?"إزالة":"Remove"}</button>
        </div>
        <div style="font-family:var(--font-data);font-weight:700">${money(price*line.qty)}</div>
      </div>`;
  }).join("");
  $("#cartTotal").textContent = money(total);
  $("#cartBody").querySelectorAll("[data-inc]").forEach(b=>b.addEventListener("click",()=>changeQty(b.dataset.inc,1)));
  $("#cartBody").querySelectorAll("[data-dec]").forEach(b=>b.addEventListener("click",()=>changeQty(b.dataset.dec,-1)));
  $("#cartBody").querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>removeLine(b.dataset.remove)));
}
function changeQty(id,delta){
  const line = cart.find(l=>l.id===id); if(!line) return;
  line.qty += delta;
  if(line.qty <= 0) cart = cart.filter(l=>l.id!==id);
  saveCart();
}
function removeLine(id){ cart = cart.filter(l=>l.id!==id); saveCart(); }

function renderWishDrawer(){
  if(wishlist.length === 0){
    $("#wishBody").innerHTML = `<p class="empty-state">${t("wish_empty")}</p>`;
    return;
  }
  $("#wishBody").innerHTML = wishlist.map(id => {
    const p = products.find(pp=>pp.id===id); if(!p) return "";
    const catSlug = categories.find(c=>c.id===p.category_id)?.slug;
    return `
      <div class="cart-line">
        <div class="thumb-sm">${CATEGORY_ICONS[catSlug]||"🫙"}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:.9rem">${lang==="ar"?p.name_ar:p.name_en}</div>
          <div style="font-family:var(--font-data);color:var(--clay);font-weight:700">${money(effectivePrice(p))}</div>
        </div>
        <button class="add-cart-btn" style="width:auto;padding:8px 12px" data-add="${p.id}">${t("add_to_cart")}</button>
      </div>`;
  }).join("");
  bindCardEvents("#wishBody");
}

/* Drawer open/close */
function openDrawer(drawer, overlay){ $(drawer).classList.add("open"); $(overlay).classList.add("open"); }
function closeDrawer(drawer, overlay){ $(drawer).classList.remove("open"); $(overlay).classList.remove("open"); }
$("#cartBtn").addEventListener("click", ()=>{ renderCartDrawer(); openDrawer("#cartDrawer","#cartOverlay"); });
$("#closeCart").addEventListener("click", ()=>closeDrawer("#cartDrawer","#cartOverlay"));
$("#cartOverlay").addEventListener("click", ()=>closeDrawer("#cartDrawer","#cartOverlay"));
$("#wishlistBtn").addEventListener("click", ()=>{ renderWishDrawer(); openDrawer("#wishDrawer","#wishOverlay"); });
$("#closeWish").addEventListener("click", ()=>closeDrawer("#wishDrawer","#wishOverlay"));
$("#wishOverlay").addEventListener("click", ()=>closeDrawer("#wishDrawer","#wishOverlay"));

/* ============================================================
   Checkout
   ============================================================ */
$("#checkoutBtn").addEventListener("click", () => {
  if(cart.length === 0) return;
  $("#checkoutOverlay").classList.add("open");
});
$$(".modal-overlay").forEach(ov => ov.addEventListener("click", (e) => { if(e.target === ov) ov.classList.remove("open"); }));

$("#checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const items = cart.map(line => {
    const p = products.find(pp=>pp.id===line.id);
    return { product_id: p.id, name_ar: p.name_ar, name_en: p.name_en, qty: line.qty, unit_price: effectivePrice(p) };
  });
  const subtotal = items.reduce((s,i)=>s+i.unit_price*i.qty,0);

  const payload = {
    user_id: currentUser?.id || null,
    customer_name: fd.get("full_name"),
    phone: fd.get("phone"),
    governorate: fd.get("governorate"),
    address: fd.get("address"),
    notes: fd.get("notes") || null,
    items,
    subtotal,
    discount_amount: 0,
    total: subtotal,
    payment_method: "cod"
  };

  const { data, error } = await supabase.from("orders").insert(payload).select().single();
  if(error){
    showToast(lang==="ar" ? "حصل خطأ، حاول تاني" : "Something went wrong, please retry");
    console.error(error);
    return;
  }

  $("#checkoutOverlay").classList.remove("open");
  $("#orderNumberDisplay").textContent = data.order_number;
  const waText = encodeURIComponent(
    `${lang==="ar"?"طلب جديد":"New order"} #${data.order_number}\n` +
    items.map(i => `${lang==="ar"?i.name_ar:i.name_en} x${i.qty}`).join("\n") +
    `\n${t("total")}: ${money(subtotal)}\n${fd.get("full_name")} - ${fd.get("phone")}\n${fd.get("governorate")}, ${fd.get("address")}`
  );
  $("#waShareOrder").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
  $("#confirmOverlay").classList.add("open");

  cart = []; saveCart();
  e.target.reset();
});
$("#closeConfirm").addEventListener("click", ()=> $("#confirmOverlay").classList.remove("open"));

/* ============================================================
   Auth (Google via Supabase)
   ============================================================ */
$("#authBtn").addEventListener("click", () => {
  if(currentUser){ supabase.auth.signOut(); return; }
  $("#authOverlay").classList.add("open");
});
$("#googleLoginBtn").addEventListener("click", async () => {
  await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
});
supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = session?.user || null;
  $("#authBtn").textContent = currentUser ? t("logout") : t("login");
  if(currentUser) $("#authOverlay").classList.remove("open");
});

/* ============================================================
   Misc
   ============================================================ */
function showToast(msg){
  const el = $("#toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(showToast._tm);
  showToast._tm = setTimeout(()=>el.classList.remove("show"), 2200);
}
$("#waFloat").addEventListener("click", (e) => {
  e.preventDefault();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank");
});

/* ============================================================
   Init
   ============================================================ */
applyI18n();
loadData();
renderCartDrawer();
renderWishDrawer();
