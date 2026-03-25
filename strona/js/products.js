const FAVORITES_STORAGE_KEY = "frostyyreps_favorites_v1";

// --- KONFIGURACJA CHMURY ---
const BIN_ID = '69c32a96aa77b81da91778f6'; 
const MASTER_KEY = '$2a$10$D/K16JUBGQOBjODs5N4xg.YKaDxJSCrHReksEeS32GBaHWglrtc9u'; 
const PRODUCTS_API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;

let productsData = [];
let filteredProducts = [];
let productSearchValue = "";

let activeCategoryFilter = "All";
let activeTagFilter = "All Tags";

window.initProducts = async function () {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  grid.innerHTML = '<div class="empty-state"><h3>Ładowanie produktów z chmury...</h3></div>';

  try {
    const response = await fetch(PRODUCTS_API_URL, {
      headers: { "X-Master-Key": MASTER_KEY }
    });
    const resData = await response.json();
    
    // JSONBin trzyma dane w polu "record"
    productsData = Array.isArray(resData.record) ? resData.record : [];
    filteredProducts = [...productsData];

    bindProductsSearch();
    bindProductsFiltersUI();
    applyProductFilters(); 
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<div class="empty-state"><h3>Błąd połączenia</h3><p>Sprawdź konfigurację bazy w chmurze.</p></div>';
  }
};

function bindProductsSearch() {
  const searchInput = document.getElementById("productSearch");
  if (!searchInput) return;
  searchInput.addEventListener("input", () => {
    productSearchValue = searchInput.value.trim().toLowerCase();
    applyProductFilters();
  });
}

function bindProductsFiltersUI() {
  const catDiv = document.getElementById('categoryOptions');
  const tagDiv = document.getElementById('tagOptions');
  const applyBtn = document.getElementById('applyFilters');
  const modal = document.getElementById('filterModal');

  if (catDiv) {
    catDiv.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-pill')) {
        catDiv.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeCategoryFilter = e.target.textContent.trim();
      }
    });
  }

  if (tagDiv) {
    tagDiv.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-pill')) {
        tagDiv.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        activeTagFilter = e.target.textContent.trim();
      }
    });
  }

  if (applyBtn && modal) {
    applyBtn.addEventListener('click', () => {
      applyProductFilters();
      modal.classList.remove('show');
    });
  }
}

function applyProductFilters() {
  filteredProducts = productsData.filter((p) => {
    const name = (p.Nazwa || "").toLowerCase();
    const searchMatch = !productSearchValue || name.includes(productSearchValue);
    const catMatch = activeCategoryFilter === "All" || p.Kategoria === activeCategoryFilter;
    const tagMatch = activeTagFilter === "All Tags" || p.Tag === activeTagFilter;
    return searchMatch && catMatch && tagMatch;
  });
  renderProducts(filteredProducts);
}

function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-state"><h3>Brak wyników</h3></div>';
    return;
  }
  grid.innerHTML = list.map(p => `
    <article class="product-card">
      <img src="${p.Link_Zdjecie}" alt="${p.Nazwa}" loading="lazy" onerror="this.src='https://placehold.co/400x400?text=Brak+zdjęcia'">
      <div class="product-meta-chips">
        <span>${p.WyswietlanaKategoria || p.Kategoria}</span>
        ${p.Tag ? `<span>${p.Tag}</span>` : ""}
      </div>
      <h3>${p.Nazwa}</h3>
      <span class="product-price-pln">$${p.Cena_USD}</span>
      <div class="product-links">
        ${p.Link_Kakobuy ? `<a href="${p.Link_Kakobuy}" target="_blank">KakoBuy</a>` : ""}
      </div>
    </article>
  `).join("");
}