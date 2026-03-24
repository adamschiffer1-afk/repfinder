const FAVORITES_STORAGE_KEY = "frostyyreps_favorites_v1";
const PRODUCTS_API_URL = "api/products.php";

const CATEGORY_PRESET = [
  "Shoes",
  "Shorts",
  "Pants",
  "T-shirts",
  "Hoodies",
  "Jackets",
  "Longsleeve",
  "Electronics",
  "Headwear",
  "Bags & Backpacks",
  "Belts",
  "Accessories"
];

const TAG_PRESET = [
  "Best Batch",
  "Budget Batch",
  "Random Batch"
];

let productsData = [];
let filteredProducts = [];
let productSearchValue = "";
let favoriteIds = loadFavorites();

let activeCategoryFilter = "all";
let activeTagFilter = "all-tags";

let pendingCategoryFilter = "all";
let pendingTagFilter = "all-tags";

window.initProducts = async function () {
  ensureProductsStyles();

  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  enhanceProductsSection();
  grid.innerHTML = createLoadingState("Loading products...");

  try {
    const response = await fetch(PRODUCTS_API_URL, { cache: "no-store" });
    const rawData = await response.json();

    productsData = Array.isArray(rawData)
      ? rawData.map((item, index) => normalizeProduct(item, index)).filter(Boolean)
      : [];

    filteredProducts = [...productsData];

    bindProductsSearch();
    bindProductsFiltersUI();
    renderProductFilterModal();
    applyProductFilters();
  } catch (error) {
    console.error("Products load error:", error);
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Couldn’t load products</h3>
        <p>Check API /products.php and products.json permissions.</p>
      </div>
    `;
  }
};

function normalizeProduct(item, index) {
  if (!item || typeof item !== "object") return null;

  const id = item.id ?? index + 1;
  const name = cleanValue(item.Nazwa);
  const priceRaw = cleanValue(item.Cena_USD);
  const rawCategory = cleanValue(item.Kategoria);
  const displayCategory = cleanValue(item.WyswietlanaKategoria);
  const rawTag = cleanValue(item.Tag);
  const image = cleanValue(item.Link_Zdjecie);
  const kakobuyLink = cleanValue(item.Link_Kakobuy);
  const litbuyLink = cleanValue(item.Link_Litbuy);

  if (!name) return null;

  const priceUsd = parsePrice(priceRaw);
  const category = normalizeCategory(rawCategory, displayCategory, name);
  const tag = normalizeTag(rawTag);

  return {
    id: String(id),
    name,
    priceUsd,
    priceRaw,
    category,
    displayCategory: displayCategory || category.toUpperCase(),
    tag,
    image,
    kakobuyLink,
    litbuyLink
  };
}

function enhanceProductsSection() {
  const section = document.getElementById("products");
  if (!section) return;

  const oldToolbar = section.querySelector(".toolbar");
  if (oldToolbar) oldToolbar.remove();

  let toolbar = document.getElementById("productsToolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.id = "productsToolbar";
    toolbar.className = "products-toolbar";
    toolbar.innerHTML = `
      <div class="products-search-box">
        <span class="products-search-icon">⌕</span>
        <input
          id="productSearch"
          class="products-search-input"
          type="text"
          placeholder="Search..."
        />
      </div>

      <button id="openProductsFiltersBtn" class="products-filter-open-btn" type="button">
        <span class="products-filter-open-icon">⌁</span>
        <span>Filters</span>
      </button>
    `;

    const head = section.querySelector(".section-head");
    if (head) {
      head.insertAdjacentElement("afterend", toolbar);
    } else {
      section.prepend(toolbar);
    }
  }

  if (!document.getElementById("productsFiltersModal")) {
    const modal = document.createElement("div");
    modal.id = "productsFiltersModal";
    modal.className = "products-filters-modal hidden";
    modal.innerHTML = `
      <div class="products-filters-backdrop" data-close-products-filters="true"></div>

      <div class="products-filters-panel" role="dialog" aria-modal="true" aria-label="Filters">
        <div class="products-filters-panel-head">
          <h3>Filters</h3>
          <button
            id="closeProductsFiltersBtn"
            class="products-filters-close-btn"
            type="button"
            aria-label="Close filters"
          >
            ×
          </button>
        </div>

        <div class="products-filters-section">
          <span class="products-filters-section-label">CATEGORIES</span>
          <div id="productsFiltersCategoryList" class="products-filters-category-list"></div>
        </div>

        <div class="products-filters-section">
          <span class="products-filters-section-label">TAGS & QUALITY</span>
          <div id="productsFiltersTagList" class="products-filters-tag-list"></div>
        </div>

        <div class="products-filters-divider"></div>

        <div class="products-filters-actions">
          <button id="clearProductsFiltersBtn" class="products-filters-clear-btn" type="button">
            Clear all
          </button>
          <button id="applyProductsFiltersBtn" class="products-filters-apply-btn" type="button">
            Show results
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

function bindProductsSearch() {
  const searchInput = document.getElementById("productSearch");
  if (!searchInput || searchInput.dataset.bound) return;

  searchInput.dataset.bound = "true";
  searchInput.addEventListener("input", () => {
    productSearchValue = searchInput.value.trim().toLowerCase();
    applyProductFilters();
  });
}

function bindProductsFiltersUI() {
  const openBtn = document.getElementById("openProductsFiltersBtn");
  const modal = document.getElementById("productsFiltersModal");

  if (openBtn && !openBtn.dataset.bound) {
    openBtn.dataset.bound = "true";
    openBtn.addEventListener("click", () => {
      pendingCategoryFilter = activeCategoryFilter;
      pendingTagFilter = activeTagFilter;
      renderProductFilterModal();
      openProductsFiltersModal();
    });
  }

  if (modal && !modal.dataset.bound) {
    modal.dataset.bound = "true";

    modal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.closeProductsFilters === "true") {
        closeProductsFiltersModal();
      }

      if (target.id === "closeProductsFiltersBtn") {
        closeProductsFiltersModal();
      }

      if (target.id === "clearProductsFiltersBtn") {
        pendingCategoryFilter = "all";
        pendingTagFilter = "all-tags";
        renderProductFilterModal();
      }

      if (target.id === "applyProductsFiltersBtn") {
        activeCategoryFilter = pendingCategoryFilter;
        activeTagFilter = pendingTagFilter;
        closeProductsFiltersModal();
        applyProductFilters();
      }
    });
  }
}

function renderProductFilterModal() {
  renderCategoryFilterList();
  renderTagFilterList();
}

function renderCategoryFilterList() {
  const list = document.getElementById("productsFiltersCategoryList");
  if (!list) return;

  const categories = getProductCategories();
  const chips = [
    { key: "all", label: "All" },
    ...categories.map((value) => ({
      key: `category:${value}`,
      label: value
    }))
  ];

  list.innerHTML = chips
    .map((chip) => {
      const active = chip.key === pendingCategoryFilter ? "active" : "";
      return `
        <button
          type="button"
          class="products-filter-modal-chip ${active}"
          data-products-category-filter="${escapeHtml(chip.key)}"
        >
          ${escapeHtml(chip.label)}
        </button>
      `;
    })
    .join("");

  list.querySelectorAll("[data-products-category-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      pendingCategoryFilter = button.getAttribute("data-products-category-filter") || "all";
      renderCategoryFilterList();
    });
  });
}

function renderTagFilterList() {
  const list = document.getElementById("productsFiltersTagList");
  if (!list) return;

  const tags = getProductTags();
  const chips = [
    { key: "all-tags", label: "All Tags" },
    ...tags.map((value) => ({
      key: `tag:${value}`,
      label: value
    }))
  ];

  list.innerHTML = chips
    .map((chip) => {
      const active = chip.key === pendingTagFilter ? "active" : "";
      return `
        <button
          type="button"
          class="products-filter-tag-chip ${active}"
          data-products-tag-filter="${escapeHtml(chip.key)}"
        >
          ${escapeHtml(chip.label)}
        </button>
      `;
    })
    .join("");

  list.querySelectorAll("[data-products-tag-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      pendingTagFilter = button.getAttribute("data-products-tag-filter") || "all-tags";
      renderTagFilterList();
    });
  });
}

function openProductsFiltersModal() {
  const modal = document.getElementById("productsFiltersModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.classList.add("products-filters-open");
}

function closeProductsFiltersModal() {
  const modal = document.getElementById("productsFiltersModal");
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.classList.remove("products-filters-open");
}

function applyProductFilters() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  filteredProducts = productsData.filter((product) => {
    const haystack = [
      product.name,
      product.category,
      product.displayCategory,
      product.tag
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !productSearchValue || haystack.includes(productSearchValue);

    let matchesCategory = true;
    let matchesTag = true;

    if (activeCategoryFilter.startsWith("category:")) {
      const targetCategory = activeCategoryFilter.replace("category:", "");
      matchesCategory = product.category === targetCategory;
    }

    if (activeTagFilter.startsWith("tag:")) {
      const targetTag = activeTagFilter.replace("tag:", "");
      matchesTag = product.tag === targetTag;
    }

    return matchesSearch && matchesCategory && matchesTag;
  });

  renderProducts(filteredProducts);
}

function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (!Array.isArray(list) || list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No products found</h3>
        <p>Try another search phrase or change the selected filter.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list
    .map((product) => {
      const isFavorite = favoriteIds.includes(String(product.id));
      const fallbackImage = product.image
        ? escapeAttribute(product.image)
        : "https://placehold.co/800x800/111827/E5E7EB?text=frostyyreps";

      return `
        <article class="product-card product-card-premium">
          <button
            type="button"
            class="product-favorite-btn ${isFavorite ? "active" : ""}"
            data-favorite-id="${escapeAttribute(String(product.id))}"
            aria-label="Toggle favorite"
          >
            ${isFavorite ? "★" : "☆"}
          </button>

          <div class="product-image-wrap">
            <img
              src="${fallbackImage}"
              alt="${escapeAttribute(product.name)}"
              loading="lazy"
              onerror="this.onerror=null;this.src='https://placehold.co/800x800/111827/E5E7EB?text=frostyyreps';"
            />
          </div>

          <div class="product-card-body">
            <div class="product-meta-chips">
              ${product.displayCategory ? `<span>${escapeHtml(product.displayCategory)}</span>` : ""}
              ${product.tag ? `<span>${escapeHtml(product.tag)}</span>` : ""}
            </div>

            <h3>${escapeHtml(product.name)}</h3>

            <div class="product-price-row">
              <span class="product-price-pln">${formatPriceUsd(product.priceUsd, product.priceRaw)}</span>
            </div>

            <div class="product-links">
              ${
                product.kakobuyLink
                  ? `<a href="${escapeAttribute(product.kakobuyLink)}" target="_blank" rel="noreferrer">KakoBuy</a>`
                  : ""
              }
              ${
                product.litbuyLink
                  ? `<a href="${escapeAttribute(product.litbuyLink)}" target="_blank" rel="noreferrer">LITBUY</a>`
                  : ""
              }
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-favorite-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-favorite-id");
      toggleFavorite(id);
      applyProductFilters();
    });
  });
}

function getProductCategories() {
  return [...CATEGORY_PRESET];
}

function getProductTags() {
  return [...TAG_PRESET];
}

function normalizeCategory(rawCategory, displayCategory, name) {
  const source = `${rawCategory} ${displayCategory} ${name}`.toLowerCase();

  if (source.includes("shoe") || source.includes("sneaker") || source.includes("jordan") || source.includes("dunk") || source.includes("af1") || source.includes("air force") || source.includes("trainer")) return "Shoes";
  if (source.includes("short")) return "Shorts";
  if (source.includes("pant") || source.includes("jean") || source.includes("trouser")) return "Pants";
  if (source.includes("t-shirt") || source.includes("tshirt") || source.includes("tee")) return "T-shirts";
  if (source.includes("hoodie")) return "Hoodies";
  if (source.includes("jacket") || source.includes("puffer") || source.includes("coat")) return "Jackets";
  if (source.includes("longsleeve") || source.includes("long sleeve")) return "Longsleeve";
  if (source.includes("electronic") || source.includes("airpods") || source.includes("speaker")) return "Electronics";
  if (source.includes("cap") || source.includes("hat") || source.includes("beanie")) return "Headwear";
  if (source.includes("bag") || source.includes("backpack")) return "Bags & Backpacks";
  if (source.includes("belt")) return "Belts";
  if (source.includes("accessor") || source.includes("jewelry") || source.includes("ring") || source.includes("bracelet")) return "Accessories";

  const cleanedDisplay = cleanValue(displayCategory);
  const cleanedRaw = cleanValue(rawCategory);

  const matchDisplay = CATEGORY_PRESET.find((item) => item.toLowerCase() === cleanedDisplay.toLowerCase());
  if (matchDisplay) return matchDisplay;

  const matchRaw = CATEGORY_PRESET.find((item) => item.toLowerCase() === cleanedRaw.toLowerCase());
  if (matchRaw) return matchRaw;

  return "Accessories";
}

function normalizeTag(rawTag) {
  const source = String(rawTag || "").toLowerCase().trim();

  if (!source) return "";
  if (source === "best" || source.includes("best batch") || source.includes("top batch") || source.includes("gx") || source.includes("pk") || source.includes("ljr")) return "Best Batch";
  if (source === "budget" || source.includes("budget batch") || source.includes("cheap")) return "Budget Batch";
  if (source === "random" || source.includes("random batch") || source.includes("mixed")) return "Random Batch";

  const cleaned = cleanValue(rawTag);
  const presetMatch = TAG_PRESET.find((item) => item.toLowerCase() === cleaned.toLowerCase());
  if (presetMatch) return presetMatch;

  return cleaned;
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  } catch (error) {
    console.warn("Could not save favorites:", error);
  }
}

function toggleFavorite(id) {
  if (!id) return;
  const normalizedId = String(id);

  if (favoriteIds.includes(normalizedId)) {
    favoriteIds = favoriteIds.filter((value) => value !== normalizedId);
  } else {
    favoriteIds = [normalizedId, ...favoriteIds];
  }

  saveFavorites();
}

function parsePrice(value) {
  const cleaned = String(value || "").replace(",", ".").match(/\d+(\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : null;
}

function formatPriceUsd(value, raw) {
  if (typeof value === "number") return `$${value.toFixed(2)}`;
  return raw ? escapeHtml(raw) : "— USD";
}

function createLoadingState(label) {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(label)}</h3>
      <p>Fetching products from products.json...</p>
    </div>
  `;
}

function cleanValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function ensureProductsStyles() {
  if (document.getElementById("products-inline-styles")) return;

  const style = document.createElement("style");
  style.id = "products-inline-styles";
  style.textContent = `
    .products-toolbar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      border-radius: 28px;
      background: rgba(34, 39, 46, 0.92);
      border: 1px solid rgba(255,255,255,0.07);
      box-shadow: 0 8px 18px rgba(0,0,0,0.16);
    }

    .products-search-box {
      flex: 1;
      min-width: 0;
      height: 54px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 18px;
      border-radius: 18px;
      background: rgba(40, 46, 54, 0.96);
      border: 1px solid rgba(255,255,255,0.08);
    }

    .products-search-icon {
      color: rgba(255,255,255,0.55);
      font-size: 18px;
      flex-shrink: 0;
    }

    .products-search-input {
      flex: 1;
      min-width: 0;
      height: 100%;
      background: transparent;
      border: 0;
      outline: none;
      color: #fff;
      font-size: 16px;
    }

    .products-search-input::placeholder {
      color: rgba(255,255,255,0.45);
    }

    .products-filter-open-btn {
      height: 54px;
      padding: 0 22px;
      border-radius: 18px;
      background: rgba(40, 46, 54, 0.96);
      border: 1px solid rgba(255,255,255,0.08);
      color: #fff;
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-weight: 700;
      flex-shrink: 0;
      justify-content: center;
    }

    .products-filter-open-btn:hover {
      background: rgba(48, 54, 63, 0.98);
    }

    .products-filter-open-icon {
      font-size: 18px;
      line-height: 1;
      opacity: 0.9;
    }

    .product-card-premium {
      position: relative;
      overflow: hidden;
      padding: 0;
      width: 100%;
      max-width: none;
    }

    .product-image-wrap {
      aspect-ratio: 1 / 1;
      background: rgba(255,255,255,0.04);
      overflow: hidden;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .product-card-premium img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      margin: 0;
      border-radius: 0;
      transition: transform 0.22s ease;
    }

    .product-card-premium:hover img {
      transform: scale(1.03);
    }

    .product-card-body {
      padding: 16px 16px 18px;
    }

    .product-card-body h3 {
      margin: 0 0 10px;
      padding-right: 38px;
      min-height: 48px;
    }

    .product-price-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }

    .product-price-pln {
      font-size: 18px;
      font-weight: 800;
      color: #fff;
    }

    .product-favorite-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: rgba(10,16,24,0.78);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      z-index: 2;
      font-size: 18px;
      line-height: 1;
    }

    .product-favorite-btn.active {
      color: #ffd24d;
    }

    .products-filters-modal {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .products-filters-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.56);
      backdrop-filter: blur(4px);
    }

    .products-filters-panel {
      position: relative;
      z-index: 1;
      width: min(100%, 520px);
      max-height: min(88vh, 820px);
      overflow: auto;
      border-radius: 34px;
      background: #d7dbe2;
      color: #1f2937;
      padding: 28px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.35);
    }

    .products-filters-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 26px;
    }

    .products-filters-panel-head h3 {
      margin: 0;
      font-size: 22px;
      font-weight: 800;
      color: #111827;
    }

    .products-filters-close-btn {
      width: 42px;
      height: 42px;
      border-radius: 999px;
      background: #e3e7ed;
      color: #6b7280;
      font-size: 28px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .products-filters-section {
      margin-bottom: 22px;
    }

    .products-filters-section-label {
      display: block;
      margin-bottom: 14px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #5f6d80;
    }

    .products-filters-category-list {
      display: grid;
      gap: 10px;
      max-height: 340px;
      overflow: auto;
      padding-right: 6px;
    }

    .products-filters-category-list::-webkit-scrollbar {
      width: 8px;
    }

    .products-filters-category-list::-webkit-scrollbar-thumb {
      background: #b7c0cc;
      border-radius: 999px;
    }

    .products-filter-modal-chip {
      min-height: 50px;
      padding: 0 20px;
      border-radius: 16px;
      background: #dde2e8;
      border: 1px solid #b4bfcc;
      color: #5f6d80;
      font-size: 16px;
      font-weight: 700;
      text-align: left;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    .products-filter-modal-chip.active {
      background: #7e8793;
      border-color: #7e8793;
      color: #ffffff;
      box-shadow: 0 10px 24px rgba(126, 135, 147, 0.24);
    }

    .products-filters-tag-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .products-filter-tag-chip {
      min-height: 46px;
      padding: 0 18px;
      border-radius: 16px;
      background: #dde2e8;
      border: 1px solid #b4bfcc;
      color: #5f6d80;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .products-filter-tag-chip.active {
      background: #7e8793;
      border-color: #7e8793;
      color: #ffffff;
      box-shadow: 0 10px 24px rgba(126, 135, 147, 0.24);
    }

    .products-filters-divider {
      width: 100%;
      height: 1px;
      background: #bcc5d0;
      margin: 18px 0 20px;
    }

    .products-filters-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .products-filters-clear-btn,
    .products-filters-apply-btn {
      height: 50px;
      border-radius: 16px;
      font-weight: 800;
      font-size: 16px;
    }

    .products-filters-clear-btn {
      background: #dde2e8;
      border: 1px solid #b4bfcc;
      color: #5f6d80;
    }

    .products-filters-apply-btn {
      background: #232830;
      color: #fff;
      border: 1px solid #232830;
    }

    body.products-filters-open {
      overflow: hidden;
    }

    @media (max-width: 820px) {
      .products-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        padding: 14px;
        border-radius: 22px;
      }

      .products-search-box,
      .products-filter-open-btn {
        width: 100%;
        min-width: 0;
      }

      .products-filter-open-btn {
        justify-content: center;
      }

      .products-filters-modal {
        padding: 10px;
        align-items: end;
      }

      .products-filters-panel {
        width: 100%;
        max-height: 92vh;
        border-radius: 24px 24px 0 0;
        padding: 18px;
      }

      .products-filters-panel-head {
        margin-bottom: 20px;
      }

      .products-filters-category-list {
        max-height: 280px;
      }

      .products-filters-actions,
      .products-filters-tag-list {
        grid-template-columns: 1fr;
      }

      .product-card-body {
        padding: 14px 14px 16px;
      }

      .product-card-body h3 {
        min-height: auto;
        font-size: 18px;
        line-height: 1.35;
      }

      .product-price-pln {
        font-size: 17px;
      }

      .product-links {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }

      .product-links a {
        width: 100%;
        justify-content: center;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
      }
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}