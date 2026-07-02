import { supabase } from "./supabase-config.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
let categories = [], products = [], discounts = [], orders = [];

function showToast(msg){
  const el = $("#toast"); el.textContent = msg; el.classList.add("show");
  clearTimeout(showToast._tm); showToast._tm = setTimeout(()=>el.classList.remove("show"), 2200);
}

/* ---------------- Auth gate ---------------- */
async function checkSession(){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session){ showLogin(); return; }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
  if(profile?.role !== "admin"){
    await supabase.auth.signOut();
    showLogin("Not authorized as admin.");
    return;
  }
  showDashboard();
}

function showLogin(err){
  $("#loginView").hidden = false; $("#dashView").hidden = true;
  if(err) $("#loginError").textContent = err;
}
function showDashboard(){
  $("#loginView").hidden = true; $("#dashView").hidden = false;
  loadAll();
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const { error } = await supabase.auth.signInWithPassword({ email: fd.get("email"), password: fd.get("password") });
  if(error){ $("#loginError").textContent = error.message; return; }
  checkSession();
});
$("#logoutBtn").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });

/* ---------------- Tabs ---------------- */
$$(".tab-btn").forEach(btn => btn.addEventListener("click", () => {
  $$(".tab-btn").forEach(b=>b.classList.remove("active"));
  $$(".panel").forEach(p=>p.classList.remove("active"));
  btn.classList.add("active");
  $("#panel-"+btn.dataset.tab).classList.add("active");
}));

/* ---------------- Load data ---------------- */
async function loadAll(){
  const [{data:c},{data:p},{data:d},{data:o},{data:r}] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("*").order("created_at",{ascending:false}),
    supabase.from("discounts").select("*").order("created_at",{ascending:false}),
    supabase.from("orders").select("*").order("created_at",{ascending:false}),
    supabase.from("reviews").select("*, products(name_en)").order("created_at",{ascending:false})
  ]);
  categories = c||[]; products = p||[]; discounts = d||[]; orders = o||[];
  renderOverview();
  renderProducts();
  renderCategories();
  renderDiscounts();
  renderOrders();
  renderReviews(r||[]);
  fillCategorySelects();
}

/* ---------------- Overview ---------------- */
function renderOverview(){
  $("#statOrders").textContent = orders.length;
  $("#statRevenue").textContent = orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.total),0).toFixed(2);
  $("#statProducts").textContent = products.filter(p=>p.status==="active").length;
  $("#statPending").textContent = orders.filter(o=>o.status==="pending").length;
  $("#recentOrdersBody").innerHTML = orders.slice(0,8).map(o => `
    <tr><td>${o.order_number}</td><td>${o.customer_name}</td><td>${Number(o.total).toFixed(2)}</td>
      <td>${o.status}</td><td>${new Date(o.created_at).toLocaleDateString()}</td></tr>`).join("");
}

/* ---------------- Products ---------------- */
function renderProducts(){
  $("#productsBody").innerHTML = products.map(p => `
    <tr>
      <td>${p.name_en} / ${p.name_ar}</td>
      <td>${categories.find(c=>c.id===p.category_id)?.name_en || "—"}</td>
      <td>${p.sale_price ?? p.price}</td>
      <td>${p.stock}</td>
      <td>${p.status}</td>
      <td class="row-actions">
        <button class="edit" data-edit="${p.id}">Edit</button>
        <button class="del" data-del="${p.id}">Delete</button>
      </td>
    </tr>`).join("");
  $$("[data-edit]").forEach(b=>b.addEventListener("click",()=>openProductModal(b.dataset.edit)));
  $$("#productsBody [data-del]").forEach(b=>b.addEventListener("click",()=>deleteRow("products",b.dataset.del,loadAll)));
}
function fillCategorySelects(){
  const opts = categories.map(c=>`<option value="${c.id}">${c.name_en}</option>`).join("");
  $("#productCategorySelect").innerHTML = opts;
  $("#targetSelect").innerHTML = opts;
}
$("#addProductBtn").addEventListener("click", () => openProductModal());
function openProductModal(id){
  const p = products.find(x=>x.id===id);
  const f = $("#productForm");
  f.reset();
  f.id.value = p?.id || "";
  $("#productModalTitle").textContent = p ? "Edit product" : "Add product";
  if(p){
    f.name_ar.value=p.name_ar; f.name_en.value=p.name_en; f.sku.value=p.sku||"";
    f.category_id.value=p.category_id||""; f.price.value=p.price; f.sale_price.value=p.sale_price||"";
    f.stock.value=p.stock; f.image_url.value=p.image_url||"";
    f.short_description_ar.value=p.short_description_ar||""; f.short_description_en.value=p.short_description_en||"";
    f.is_featured.checked=p.is_featured; f.is_best_seller.checked=p.is_best_seller; f.status.value=p.status;
  }
  $("#productModal").classList.add("open");
}
$("#productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    name_ar: fd.get("name_ar"), name_en: fd.get("name_en"), sku: fd.get("sku")||null,
    category_id: fd.get("category_id")||null, price: Number(fd.get("price")),
    sale_price: fd.get("sale_price") ? Number(fd.get("sale_price")) : null,
    stock: Number(fd.get("stock")), image_url: fd.get("image_url")||null,
    short_description_ar: fd.get("short_description_ar")||null,
    short_description_en: fd.get("short_description_en")||null,
    is_featured: fd.get("is_featured")==="on", is_best_seller: fd.get("is_best_seller")==="on",
    status: fd.get("status"), updated_at: new Date().toISOString()
  };
  const id = fd.get("id");
  const { error } = id
    ? await supabase.from("products").update(payload).eq("id", id)
    : await supabase.from("products").insert(payload);
  if(error){ showToast(error.message); return; }
  $("#productModal").classList.remove("open");
  showToast("Saved"); loadAll();
});

/* ---------------- Categories ---------------- */
function renderCategories(){
  $("#categoriesBody").innerHTML = categories.map(c => `
    <tr><td>${c.name_ar}</td><td>${c.name_en}</td><td>${c.slug}</td>
      <td class="row-actions"><button class="edit" data-cedit="${c.id}">Edit</button>
      <button class="del" data-cdel="${c.id}">Delete</button></td></tr>`).join("");
  $$("[data-cedit]").forEach(b=>b.addEventListener("click",()=>openCategoryModal(b.dataset.cedit)));
  $$("[data-cdel]").forEach(b=>b.addEventListener("click",()=>deleteRow("categories",b.dataset.cdel,loadAll)));
}
$("#addCategoryBtn").addEventListener("click", ()=>openCategoryModal());
function openCategoryModal(id){
  const c = categories.find(x=>x.id===id);
  const f = $("#categoryForm"); f.reset(); f.id.value = c?.id || "";
  $("#categoryModalTitle").textContent = c ? "Edit category" : "Add category";
  if(c){ f.name_ar.value=c.name_ar; f.name_en.value=c.name_en; f.slug.value=c.slug; f.sort_order.value=c.sort_order; }
  $("#categoryModal").classList.add("open");
}
$("#categoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = { name_ar: fd.get("name_ar"), name_en: fd.get("name_en"), slug: fd.get("slug"), sort_order: Number(fd.get("sort_order")||0) };
  const id = fd.get("id");
  const { error } = id
    ? await supabase.from("categories").update(payload).eq("id", id)
    : await supabase.from("categories").insert(payload);
  if(error){ showToast(error.message); return; }
  $("#categoryModal").classList.remove("open");
  showToast("Saved"); loadAll();
});

/* ---------------- Discounts ---------------- */
function renderDiscounts(){
  $("#discountsBody").innerHTML = discounts.map(d => `
    <tr><td>${d.label_en||d.label_ar||"—"}</td><td>${d.type}</td><td>${d.value}</td>
      <td>${d.applies_to}</td><td>${d.active?"yes":"no"}</td>
      <td class="row-actions"><button class="edit" data-dedit="${d.id}">Edit</button>
      <button class="del" data-ddel="${d.id}">Delete</button></td></tr>`).join("");
  $$("[data-dedit]").forEach(b=>b.addEventListener("click",()=>openDiscountModal(b.dataset.dedit)));
  $$("[data-ddel]").forEach(b=>b.addEventListener("click",()=>deleteRow("discounts",b.dataset.ddel,loadAll)));
}
$("#addDiscountBtn").addEventListener("click", ()=>openDiscountModal());
$("#appliesToSelect").addEventListener("change", (e) => { $("#targetField").hidden = e.target.value === "all"; });
function openDiscountModal(id){
  const d = discounts.find(x=>x.id===id);
  const f = $("#discountForm"); f.reset(); f.id.value = d?.id || "";
  $("#discountModalTitle").textContent = d ? "Edit discount" : "Add discount";
  $("#targetField").hidden = true;
  if(d){
    f.label_ar.value=d.label_ar||""; f.label_en.value=d.label_en||""; f.type.value=d.type;
    f.value.value=d.value; f.applies_to.value=d.applies_to; f.active.checked=d.active;
    if(d.applies_to!=="all"){ $("#targetField").hidden=false; f.target_id.value=d.target_id||""; }
  }
  $("#discountModal").classList.add("open");
}
$("#discountForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    label_ar: fd.get("label_ar")||null, label_en: fd.get("label_en")||null, type: fd.get("type"),
    value: Number(fd.get("value")), applies_to: fd.get("applies_to"),
    target_id: fd.get("applies_to")==="all" ? null : fd.get("target_id"),
    active: fd.get("active")==="on"
  };
  const id = fd.get("id");
  const { error } = id
    ? await supabase.from("discounts").update(payload).eq("id", id)
    : await supabase.from("discounts").insert(payload);
  if(error){ showToast(error.message); return; }
  $("#discountModal").classList.remove("open");
  showToast("Saved"); loadAll();
});

/* ---------------- Orders ---------------- */
const STATUSES = ["pending","confirmed","processing","shipped","delivered","cancelled"];
function renderOrders(){
  $("#ordersBody").innerHTML = orders.map(o => `
    <tr>
      <td>${o.order_number}</td><td>${o.customer_name}</td><td>${o.phone}</td><td>${o.governorate}</td>
      <td>${Number(o.total).toFixed(2)}</td>
      <td><select class="status-select" data-order="${o.id}">
        ${STATUSES.map(s=>`<option value="${s}" ${s===o.status?"selected":""}>${s}</option>`).join("")}
      </select></td>
      <td>${new Date(o.created_at).toLocaleString()}</td>
    </tr>`).join("");
  $$(".status-select").forEach(sel => sel.addEventListener("change", async () => {
    const { error } = await supabase.from("orders").update({status: sel.value, updated_at: new Date().toISOString()}).eq("id", sel.dataset.order);
    if(error){ showToast(error.message); return; }
    showToast("Order updated");
  }));
}

/* ---------------- Reviews ---------------- */
function renderReviews(reviews){
  $("#reviewsBody").innerHTML = reviews.map(r => `
    <tr>
      <td>${r.products?.name_en || "—"}</td><td>${r.customer_name}</td><td>${"★".repeat(r.rating)}</td>
      <td>${r.comment||""}</td><td>${r.status}</td>
      <td class="row-actions">
        <button class="edit" data-approve="${r.id}">Approve</button>
        <button class="del" data-reject="${r.id}">Reject</button>
        <button class="del" data-rdel="${r.id}">Delete</button>
      </td>
    </tr>`).join("");
  $$("[data-approve]").forEach(b=>b.addEventListener("click",()=>setReviewStatus(b.dataset.approve,"approved")));
  $$("[data-reject]").forEach(b=>b.addEventListener("click",()=>setReviewStatus(b.dataset.reject,"rejected")));
  $$("[data-rdel]").forEach(b=>b.addEventListener("click",()=>deleteRow("reviews",b.dataset.rdel,loadAll)));
}
async function setReviewStatus(id,status){
  const { error } = await supabase.from("reviews").update({status}).eq("id", id);
  if(error){ showToast(error.message); return; }
  loadAll();
}

/* ---------------- Shared ---------------- */
async function deleteRow(table, id, cb){
  if(!confirm("Delete this item?")) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if(error){ showToast(error.message); return; }
  cb();
}
$$(".modal-overlay").forEach(ov => ov.addEventListener("click", (e)=>{ if(e.target===ov) ov.classList.remove("open"); }));

checkSession();
