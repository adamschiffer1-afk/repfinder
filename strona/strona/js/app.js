document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".page-section");
  const toolsToggle = document.getElementById("toolsToggle");
  const toolsMenu = document.getElementById("toolsMenu");
  const logo = document.getElementById("logo");
  const homeSearch = document.getElementById("homeSearch");

  function showSection(id) {
    // Ukrywamy wszystkie sekcje
    sections.forEach(section => section.classList.remove("active"));

    // Pokazujemy wybraną
    const target = document.getElementById(id);
    if (target) target.classList.add("active");

    // Zamykamy menu Tools
    if (toolsMenu) toolsMenu.classList.remove("show");

    // === NAPRAWA: przełączanie aktywnego linku w nawigacji ===
    document.querySelectorAll(".nav-link").forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("data-section-link") === id) {
        link.classList.add("active");
      }
    });
  }

  window.showSection = showSection;

  // Kliknięcie w linki nawigacji
  document.querySelectorAll("[data-section-link]").forEach(element => {
    element.addEventListener("click", () => {
      const target = element.getAttribute("data-section-link");
      if (target) showSection(target);
    });
  });

  // Kliknięcie w logo → Home
  if (logo) {
    logo.addEventListener("click", () => showSection("home"));
  }

  // Menu Tools
  if (toolsToggle && toolsMenu) {
    toolsToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toolsMenu.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (!toolsMenu.contains(e.target) && e.target !== toolsToggle) {
        toolsMenu.classList.remove("show");
      }
    });
  }

  // Wyszukiwanie z home
  if (homeSearch) {
    homeSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        const value = homeSearch.value.trim();
        showSection("products");

        const productSearch = document.getElementById("productSearch");
        if (productSearch) {
          productSearch.value = value;
          productSearch.dispatchEvent(new Event("input"));
        }
      }
    });
  }

  // Inicjalizacja modułów
  if (typeof window.initProducts === "function") window.initProducts();
  if (typeof window.initSellers === "function") window.initSellers();
  if (typeof window.initTutorials === "function") window.initTutorials();
  if (typeof window.initTracking === "function") window.initTracking();
  if (typeof window.initConverter === "function") window.initConverter();

  // Start na Home
  showSection("home");
});