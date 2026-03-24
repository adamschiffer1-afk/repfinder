const FAVORITES_STORAGE_KEY = "frostyyreps_favorites_v1";
const PRODUCTS_API_URL = "api/products.php"; // Jeśli nie używasz PHP, zmień to na "products.json"

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

// Zmienne powiązane z HTML z index.html
let activeCategoryFilter = "All";
let activeTagFilter = "All Tags";

window.initProducts = async function () {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.innerHTML = createLoadingState("Ładowanie produktów...");

  try {
    const response = await fetch(PRODUCTS_API_URL, { cache: "no-store" });
    const rawData = await response.json();

    productsData = Array.isArray(rawData)
      ? rawData.map((item, index) => normalizeProduct(item, index)).filter(Boolean)
      : [];

    filteredProducts = [...productsData];

    bindProductsSearch();
    bindProductsFiltersUI();
    applyProductFilters(); // Wyrenderuj na start
  } catch (error) {
    console.error("Products load error:", error);
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Nie udało się załadować produktów</h3>
        <p>Sprawdź permissions dla products.json lub pliku PHP.</p>
      </div>
    `;
  }
};

function normalizeProduct(item, index) {
  if (!item || typeof item !== "object") return null;

  const id = item.id ?? index + 1;
  const name = cleanValue(item.Nazwa || item.name);
  const priceRaw = cleanValue(item.Cena_USD || item.price);
  const rawCategory = cleanValue(item.Kategoria || item.category);
  const displayCategory = cleanValue(item.WyswietlanaKategoria);
  const rawTag = cleanValue(item.Tag || item.tag);
  const image = cleanValue(item.Link_Zdjecie || item.image);
  const kakobuyLink = cleanValue(item.Link_Kakobuy || item.link);
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
    displayCategory: displayCategory || category,
    tag,
    image,
    kakobuyLink,
    litbuyLink
  };
}

// Podpięcie wyszukiwarki głównej z index.html
function bindProductsSearch() {
  const searchInput = document.getElementById("productSearch");
  if (!searchInput || searchInput.dataset.bound) return;

  searchInput.dataset.bound = "true";
  searchInput.addEventListener("input", () => {
    productSearchValue = searchInput.value.trim().toLowerCase();
    applyProductFilters();
  });
}

// Podpięcie Modalu i Pigułek z index.html
function bindProductsFiltersUI() {
  // Pigułki kategorii
  const catDiv = document.getElementById('categoryOptions');
  if (catDiv) {
    catDiv.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-pill')) {
        activeCategoryFilter = e.target.textContent.trim();
      }
    });
  }

  // Pigułki tagów
  const tagDiv = document.getElementById('tagOptions');
  if (tagDiv) {
    tagDiv.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-pill')) {
        activeTagFilter = e.target.textContent.trim();
      }
    });
  }

  // Przycisk "Show results" (zastosuj i zamknij modal)
  const applyBtn = document.getElementById('applyFilters');
  const modal = document.getElementById('filterModal');
  
  if (applyBtn && modal) {
    applyBtn.addEventListener('click', () => {
      applyProductFilters();
      modal.classList.remove('show');
    });
  }

  // Przycisk "Clear all"
  const clearBtn = document.getElementById('clearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      activeCategoryFilter = "All";
      activeTagFilter = "All Tags";
      
      // Zresetuj wygląd pigułek
      if (catDiv) {
        catDiv.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        const allBtn = Array.from(catDiv.children).find(b => b.textContent === "All");
        if (allBtn) allBtn.classList.add('active');
      }
      
      if (tagDiv) {
        tagDiv.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        const allTagsBtn = Array.from(tagDiv.children).find(b => b.textContent === "All Tags");
        if (allTagsBtn) allTagsBtn.classList.add('active');
      }

      applyProductFilters();
      modal.classList.remove('show');
    });
  }
}

// Funkcja odpowiedzialna za faktyczne filtrowanie listy
function applyProductFilters() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  filteredProducts = productsData.filter((product) => {
    const haystack = [
      product.name,
      product.category,
      product.displayCategory,
      product.tag
    ].join(" ").toLowerCase();

    // Szukajka
    const matchesSearch = !productSearchValue || haystack.includes(productSearchValue);

    // Kategoria
    let matchesCategory = true;
    if (activeCategoryFilter !== "All") {
      matchesCategory = product.category.toLowerCase() === activeCategoryFilter.toLowerCase() || 
                        product.displayCategory.toLowerCase() === activeCategoryFilter.toLowerCase();
    }

    // Tag / Jakość
    let matchesTag = true;
    if (activeTagFilter !== "All Tags") {
      matchesTag = product.tag.toLowerCase() === activeTagFilter.toLowerCase();
    }

    return matchesSearch && matchesCategory && matchesTag;
  });

  renderProducts(filteredProducts);
}

// Renderowanie na ekran na podstawie Twojego HTML/CSS
function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (!Array.isArray(list) || list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>Nie znaleziono produktów</h3>
        <p>Spróbuj innej frazy lub zmień filtry.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map((product) => {
    const isFavorite = favoriteIds.includes(String(product.id));
    const fallbackImage = product.image
      ? escapeAttribute(product.image)
      : "https://placehold.co/800x800/111827/E5E7EB?text=repfinder";

    return `
      <article class="product-card">
        <img
          src="${fallbackImage}"
          alt="${escapeAttribute(product.name)}"
          loading="lazy"
          onerror="this.onerror=null;this.src='https://placehold.co/800x800/111827/E5E7EB?text=Brak+zdjęcia';"
        />
        
        <div class="product-meta-chips">
          ${product.displayCategory ? `<span>${escapeHtml(product.displayCategory)}</span>` : ""}
          ${product.tag ? `<span>${escapeHtml(product.tag)}</span>` : ""}
        </div>

        <h3>${escapeHtml(product.name)}</h3>

        <span class="product-price-pln">${formatPriceUsd(product.priceUsd, product.priceRaw)}</span>

        <div class="product-links">
          ${product.kakobuyLink ? `<a href="${escapeAttribute(product.kakobuyLink)}" target="_blank" rel="noreferrer">KakoBuy</a>` : ""}
          ${product.litbuyLink ? `<a href="${escapeAttribute(product.litbuyLink)}" target="_blank" rel="noreferrer">LITBUY</a>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

// Helpers
function getProductCategories() { return [...CATEGORY_PRESET]; }
function getProductTags() { return [...TAG_PRESET]; }

function normalizeCategory(rawCategory, displayCategory, name) {
  const source = `${rawCategory} ${displayCategory} ${name}`.toLowerCase();

  if (source.includes("shoe") || source.includes("sneaker") || source.includes("jordan") || source.includes("dunk")) return "Shoes";
  if (source.includes("short")) return "Shorts";
  if (source.includes("pant") || source.includes("jean")) return "Pants";
  if (source.includes("t-shirt") || source.includes("tee")) return "T-shirts";
  if (source.includes("hoodie")) return "Hoodies";
  if (source.includes("jacket")) return "Jackets";
  if (source.includes("longsleeve")) return "Longsleeve";
  if (source.includes("electronic") || source.includes("airpods")) return "Electronics";
  if (source.includes("cap") || source.includes("hat")) return "Headwear";
  if (source.includes("bag") || source.includes("backpack")) return "Bags & Backpacks";
  if (source.includes("belt")) return "Belts";
  
  return "Accessories";
}

function normalizeTag(rawTag) {
  const source = String(rawTag || "").toLowerCase().trim();
  if (!source) return "";
  if (source.includes("best") || source.includes("top") || source.includes("gx") || source.includes("ljr")) return "Best Batch";
  if (source.includes("budget") || source.includes("cheap")) return "Budget Batch";
  return "Random Batch";
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) { return []; }
}

function saveFavorites() {
  try { localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds)); }
  catch (error) { console.warn(error); }
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
      <p>Trwa pobieranie bazy danych...</p>
    </div>
  `;
}

function cleanValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
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