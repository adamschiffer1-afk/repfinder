const ADMIN_STORAGE_KEY = "frostyyreps_products_db_v1";
const ADMIN_AUTH_STORAGE_KEY = "frostyyreps_admin_auth_v1";

const ADMIN_LOGIN = "admin67";
const ADMIN_PASSWORD = "kutas123";

const DEFAULT_PRODUCTS = [
  {
    Nazwa: "Air Force 1 White",
    Cena_USD: "17.80",
    Kategoria: "shoes",
    WyswietlanaKategoria: "SHOES",
    Tag: "best",
    Link_Zdjecie: "https://s1.geiicdn.com/pcitem1910064118-6cef00000195130cfe960a230115-unadjust_675_675.png?w=400&h=400",
    Link_Kakobuy: "https://ikako.vip/bcw4x",
    Link_Litbuy: "https://litbuy.com/product/weidian/7443873892"
  }
];

let adminProducts = loadAdminProducts();
let filteredAdminProducts = [...adminProducts];
let currentEditingIndex = -1;
let adminInitialized = false;

const refs = {};

document.addEventListener("DOMContentLoaded", () => {
  bindRefs();
  setupAdminAuth();

  if (!isAdminAuthenticated()) {
    lockAdmin();
    bindLoginForm();
    return;
  }

  unlockAdmin();
  initAdminApp();
});

function bindRefs() {
  refs.authOverlay = document.getElementById("adminAuthOverlay");
  refs.loginForm = document.getElementById("adminLoginForm");
  refs.loginUsername = document.getElementById("adminLoginUsername");
  refs.loginPassword = document.getElementById("adminLoginPassword");
  refs.loginError = document.getElementById("adminLoginError");
  refs.logoutBtn = document.getElementById("logoutAdminBtn");

  refs.totalProducts = document.getElementById("adminTotalProducts");
  refs.filteredProducts = document.getElementById("adminFilteredProducts");
  refs.categoriesCount = document.getElementById("adminCategoriesCount");
  refs.tagsCount = document.getElementById("adminTagsCount");

  refs.searchInput = document.getElementById("adminSearchInput");
  refs.categoryFilter = document.getElementById("adminCategoryFilter");
  refs.tagFilter = document.getElementById("adminTagFilter");

  refs.productsList = document.getElementById("adminProductsList");
  refs.preview = document.getElementById("adminPreview");
  refs.rawOutput = document.getElementById("adminRawOutput");

  refs.form = document.getElementById("productForm");
  refs.editorTitle = document.getElementById("editorTitle");
  refs.editingId = document.getElementById("productEditingId");

  refs.name = document.getElementById("productName");
  refs.priceUsd = document.getElementById("productPriceUsd");
  refs.category = document.getElementById("productCategory");
  refs.displayCategory = document.getElementById("productDisplayCategory");
  refs.tag = document.getElementById("productTag");
  refs.image = document.getElementById("productImage");
  refs.kakobuy = document.getElementById("productKakoBuy");
  refs.litbuy = document.getElementById("productLitbuy");

  refs.newBtn = document.getElementById("newProductBtn");
  refs.clearBtn = document.getElementById("clearFormBtn");
  refs.deleteBtn = document.getElementById("deleteProductBtn");
  refs.duplicateBtn = document.getElementById("duplicateProductBtn");

  refs.exportBtn = document.getElementById("exportJsonBtn");
  refs.importInput = document.getElementById("importJsonInput");
  refs.resetBtn = document.getElementById("resetStorageBtn");
}

function setupAdminAuth() {
  if (refs.logoutBtn) {
    refs.logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
      window.location.reload();
    });
  }
}

function bindLoginForm() {
  if (!refs.loginForm || refs.loginForm.dataset.bound === "true") return;
  refs.loginForm.dataset.bound = "true";

  refs.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = String(refs.loginUsername.value || "").trim();
    const password = String(refs.loginPassword.value || "").trim();

    if (username === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "1");
      refs.loginError.textContent = "";
      unlockAdmin();
      initAdminApp();
      return;
    }

    refs.loginError.textContent = "Nieprawidłowy login lub hasło.";
  });
}

function isAdminAuthenticated() {
  return localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "1";
}

function lockAdmin() {
  document.body.classList.add("admin-auth-locked");
  if (refs.authOverlay) refs.authOverlay.classList.remove("hidden");
}

function unlockAdmin() {
  document.body.classList.remove("admin-auth-locked");
  if (refs.authOverlay) refs.authOverlay.classList.add("hidden");
}

function initAdminApp() {
  if (adminInitialized) return;
  adminInitialized = true;

  bindAdminEvents();
  refreshAdminUI();
  resetEditor();
}

function bindAdminEvents() {
  refs.searchInput.addEventListener("input", refreshAdminUI);
  refs.categoryFilter.addEventListener("change", refreshAdminUI);
  refs.tagFilter.addEventListener("change", refreshAdminUI);

  refs.newBtn.addEventListener("click", () => {
    resetEditor();
  });

  refs.clearBtn.addEventListener("click", () => {
    resetEditor();
  });

  refs.duplicateBtn.addEventListener("click", () => {
    const payload = getFormPayload();
    payload.Nazwa = payload.Nazwa ? `${payload.Nazwa} Copy` : "New Product Copy";
    currentEditingIndex = -1;
    fillForm(payload);
    refs.editorTitle.textContent = "Duplicate product";
    refs.deleteBtn.classList.add("hidden");
    updatePreviewFromForm();
  });

  refs.deleteBtn.addEventListener("click", () => {
    if (currentEditingIndex < 0) return;

    const confirmed = window.confirm("Na pewno usunąć ten produkt?");
    if (!confirmed) return;

    adminProducts.splice(currentEditingIndex, 1);
    saveAdminProducts();
    refreshAdminUI();
    resetEditor();
  });

  refs.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const payload = getFormPayload();
    const validationError = validateProduct(payload);

    if (validationError) {
      window.alert(validationError);
      return;
    }

    if (currentEditingIndex >= 0) {
      adminProducts[currentEditingIndex] = payload;
    } else {
      adminProducts.unshift(payload);
    }

    saveAdminProducts();
    refreshAdminUI();

    const newIndex = findProductIndex(payload);
    if (newIndex >= 0) {
      openEditor(newIndex);
    } else {
      resetEditor();
    }
  });

  [
    refs.name,
    refs.priceUsd,
    refs.category,
    refs.displayCategory,
    refs.tag,
    refs.image,
    refs.kakobuy,
    refs.litbuy
  ].forEach((element) => {
    element.addEventListener("input", updatePreviewFromForm);
    element.addEventListener("change", updatePreviewFromForm);
  });

  refs.exportBtn.addEventListener("click", exportProductsJson);

  refs.importInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        window.alert("Plik JSON musi zawierać tablicę produktów.");
        return;
      }

      adminProducts = parsed.map(normalizeImportedProduct).filter(Boolean);
      saveAdminProducts();
      refreshAdminUI();
      resetEditor();
      refs.importInput.value = "";
    } catch (error) {
      console.error(error);
      window.alert("Nie udało się wczytać pliku JSON.");
    }
  });

  refs.resetBtn.addEventListener("click", () => {
    const confirmed = window.confirm("To wyczyści zapisane produkty i przywróci domyślne. Kontynuować?");
    if (!confirmed) return;

    localStorage.removeItem(ADMIN_STORAGE_KEY);
    adminProducts = [...DEFAULT_PRODUCTS];
    saveAdminProducts();
    refreshAdminUI();
    resetEditor();
  });
}

function refreshAdminUI() {
  filteredAdminProducts = getFilteredProducts();

  renderStats();
  renderFilters();
  renderProductsList();
  renderRawOutput();
}

function renderStats() {
  const categories = new Set(
    adminProducts.map((item) => String(item.Kategoria || "").trim()).filter(Boolean)
  );

  const tags = new Set(
    adminProducts.map((item) => String(item.Tag || "").trim()).filter(Boolean)
  );

  refs.totalProducts.textContent = String(adminProducts.length);
  refs.filteredProducts.textContent = String(filteredAdminProducts.length);
  refs.categoriesCount.textContent = String(categories.size);
  refs.tagsCount.textContent = String(tags.size);
}

function renderFilters() {
  const currentCategory = refs.categoryFilter.value || "all";
  const currentTag = refs.tagFilter.value || "all";

  const categories = Array.from(
    new Set(adminProducts.map((item) => String(item.Kategoria || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const tags = Array.from(
    new Set(adminProducts.map((item) => String(item.Tag || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  refs.categoryFilter.innerHTML = `
    <option value="all">All</option>
    ${categories.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}
  `;

  refs.tagFilter.innerHTML = `
    <option value="all">All</option>
    ${tags.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}
  `;

  refs.categoryFilter.value = categories.includes(currentCategory) ? currentCategory : "all";
  refs.tagFilter.value = tags.includes(currentTag) ? currentTag : "all";
}

function renderProductsList() {
  if (!filteredAdminProducts.length) {
    refs.productsList.innerHTML = `<div class="admin-empty-list">Brak produktów dla tego filtra.</div>`;
    return;
  }

  refs.productsList.innerHTML = filteredAdminProducts
    .map((product) => {
      const realIndex = adminProducts.indexOf(product);
      const active = realIndex === currentEditingIndex ? "active" : "";

      return `
        <article class="admin-product-item ${active}">
          <div class="admin-product-item-head">
            <div>
              <h3 class="admin-product-item-title">${escapeHtml(product.Nazwa || "Unnamed")}</h3>
              <p class="admin-product-item-sub">
                ${escapeHtml(product.Kategoria || "-")} · ${escapeHtml(product.Tag || "no tag")} · $${escapeHtml(product.Cena_USD || "-")}
              </p>
            </div>

            <div class="admin-product-item-actions">
              <button class="admin-mini-btn" type="button" data-edit-product="${realIndex}">Edit</button>
              <button class="admin-mini-btn danger" type="button" data-delete-product="${realIndex}">Delete</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  refs.productsList.querySelectorAll("[data-edit-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.getAttribute("data-edit-product"));
      openEditor(index);
    });
  });

  refs.productsList.querySelectorAll("[data-delete-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.getAttribute("data-delete-product"));
      const confirmed = window.confirm("Na pewno usunąć ten produkt?");
      if (!confirmed) return;

      adminProducts.splice(index, 1);
      saveAdminProducts();
      refreshAdminUI();

      if (currentEditingIndex === index) {
        resetEditor();
      } else if (currentEditingIndex > index) {
        currentEditingIndex -= 1;
      }
    });
  });
}

function renderRawOutput() {
  refs.rawOutput.value = JSON.stringify(adminProducts, null, 2);
}

function openEditor(index) {
  const product = adminProducts[index];
  if (!product) return;

  currentEditingIndex = index;
  fillForm(product);
  refs.editorTitle.textContent = `Edit product #${index + 1}`;
  refs.deleteBtn.classList.remove("hidden");
  updatePreviewFromForm();
  renderProductsList();
}

function resetEditor() {
  currentEditingIndex = -1;
  refs.editorTitle.textContent = "New product";
  refs.deleteBtn.classList.add("hidden");
  refs.form.reset();
  refs.editingId.value = "";
  refs.tag.value = "";
  updatePreviewFromForm();
  renderProductsList();
}

function fillForm(product) {
  refs.name.value = product.Nazwa || "";
  refs.priceUsd.value = product.Cena_USD || "";
  refs.category.value = product.Kategoria || "";
  refs.displayCategory.value = product.WyswietlanaKategoria || "";
  refs.tag.value = product.Tag || "";
  refs.image.value = product.Link_Zdjecie || "";
  refs.kakobuy.value = product.Link_Kakobuy || "";
  refs.litbuy.value = product.Link_Litbuy || "";
}

function getFormPayload() {
  return {
    Nazwa: refs.name.value.trim(),
    Cena_USD: refs.priceUsd.value.trim(),
    Kategoria: refs.category.value.trim(),
    WyswietlanaKategoria: refs.displayCategory.value.trim(),
    Tag: refs.tag.value.trim(),
    Link_Zdjecie: refs.image.value.trim(),
    Link_Kakobuy: refs.kakobuy.value.trim(),
    Link_Litbuy: refs.litbuy.value.trim()
  };
}

function updatePreviewFromForm() {
  const product = getFormPayload();
  refs.preview.innerHTML = buildPreviewCard(product);
}

function buildPreviewCard(product) {
  const image = product.Link_Zdjecie || "https://placehold.co/800x800/111827/E5E7EB?text=frostyyreps";

  const badges = [
    product.WyswietlanaKategoria || "",
    normalizeTagLabel(product.Tag || "")
  ].filter(Boolean);

  return `
    <article class="admin-preview-card">
      <div class="admin-preview-image">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(product.Nazwa || "Preview")}" />
      </div>

      <div class="admin-preview-body">
        <div class="admin-preview-badges">
          ${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}
        </div>

        <h3 class="admin-preview-title">${escapeHtml(product.Nazwa || "Product name")}</h3>
        <div class="admin-preview-price">$${escapeHtml(product.Cena_USD || "0.00")}</div>

        <div class="admin-preview-links">
          ${product.Link_Kakobuy ? `<a href="${escapeHtml(product.Link_Kakobuy)}" target="_blank" rel="noreferrer">KakoBuy</a>` : ""}
          ${product.Link_Litbuy ? `<a href="${escapeHtml(product.Link_Litbuy)}" target="_blank" rel="noreferrer">LITBUY</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

function getFilteredProducts() {
  const search = refs.searchInput.value.trim().toLowerCase();
  const category = refs.categoryFilter.value;
  const tag = refs.tagFilter.value;

  return adminProducts.filter((product) => {
    const haystack = [
      product.Nazwa,
      product.Kategoria,
      product.WyswietlanaKategoria,
      product.Tag
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || haystack.includes(search);
    const matchesCategory = category === "all" || product.Kategoria === category;
    const matchesTag = tag === "all" || product.Tag === tag;

    return matchesSearch && matchesCategory && matchesTag;
  });
}

function validateProduct(product) {
  if (!product.Nazwa) return "Podaj nazwę produktu.";
  if (!product.Cena_USD) return "Podaj cenę USD.";
  if (!product.Kategoria) return "Podaj kategorię.";
  if (!product.WyswietlanaKategoria) return "Podaj wyświetlaną kategorię.";
  if (!product.Link_Zdjecie) return "Podaj link do zdjęcia.";
  if (!product.Link_Kakobuy && !product.Link_Litbuy) {
    return "Podaj przynajmniej jeden link sklepu.";
  }
  return "";
}

function normalizeImportedProduct(item) {
  if (!item || typeof item !== "object") return null;

  return {
    Nazwa: String(item.Nazwa || "").trim(),
    Cena_USD: String(item.Cena_USD || "").trim(),
    Kategoria: String(item.Kategoria || "").trim(),
    WyswietlanaKategoria: String(item.WyswietlanaKategoria || "").trim(),
    Tag: String(item.Tag || "").trim(),
    Link_Zdjecie: String(item.Link_Zdjecie || "").trim(),
    Link_Kakobuy: String(item.Link_Kakobuy || "").trim(),
    Link_Litbuy: String(item.Link_Litbuy || "").trim()
  };
}

function normalizeTagLabel(value) {
  const tag = String(value || "").trim().toLowerCase();

  if (tag === "best") return "Best Batch";
  if (tag === "budget") return "Budget Batch";
  if (tag === "random") return "Random Batch";
  return value || "";
}

function findProductIndex(payload) {
  return adminProducts.findIndex((item) => {
    return (
      item.Nazwa === payload.Nazwa &&
      item.Cena_USD === payload.Cena_USD &&
      item.Kategoria === payload.Kategoria &&
      item.WyswietlanaKategoria === payload.WyswietlanaKategoria &&
      item.Tag === payload.Tag &&
      item.Link_Zdjecie === payload.Link_Zdjecie &&
      item.Link_Kakobuy === payload.Link_Kakobuy &&
      item.Link_Litbuy === payload.Link_Litbuy
    );
  });
}

function loadAdminProducts() {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return [...DEFAULT_PRODUCTS];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_PRODUCTS];

    return parsed.map(normalizeImportedProduct).filter(Boolean);
  } catch (error) {
    console.error(error);
    return [...DEFAULT_PRODUCTS];
  }
}

function saveAdminProducts() {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminProducts));
}

function exportProductsJson() {
  const blob = new Blob([JSON.stringify(adminProducts, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "frostyyreps-products.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}