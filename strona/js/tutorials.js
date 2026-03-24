window.initTutorials = function () {
  const overview = document.getElementById("tutorialsOverview");
  const player = document.getElementById("tutorialPlayer");
  const backBtn = document.getElementById("tutorialBackToList");
  const progressBar = document.getElementById("tutorialProgressBar");
  const topSteps = document.getElementById("tutorialTopSteps");
  const sideSteps = document.getElementById("tutorialSideSteps");
  const mainTitle = document.getElementById("tutorialMainTitle");
  const mainSubtitle = document.getElementById("tutorialMainSubtitle");
  const stepBadge = document.getElementById("tutorialStepBadge");
  const stepTitle = document.getElementById("tutorialStepTitle");
  const stepMeta = document.getElementById("tutorialStepMeta");
  const stepDescription = document.getElementById("tutorialStepDescription");
  const stepMedia = document.getElementById("tutorialStepMedia");
  const stepActions = document.getElementById("tutorialStepActions");
  const prevBtn = document.getElementById("tutorialPrevBtn");
  const nextBtn = document.getElementById("tutorialNextBtn");
  const restartBtn = document.getElementById("tutorialRestartBtn");

  if (!overview || !player) return;

  const tutorial = {
    title: "Jak zamawiać na KakoBuy",
    subtitle: "Prosty przewodnik krok po kroku, jak zrobić zamówienie przez agentów KakoBuy.",
    steps: [
      {
        title: "Załóż konto",
        description: "Wejdź na stronę KakoBuy, utwórz konto podając e-mail i hasło, a następnie potwierdź rejestrację.",
        visual: "register",
        action: { label: "Załóż konto na KakoBuy", href: "https://www.kakobuy.com/" }
      },
      {
        title: "Znajdź produkty",
        description: "Szukaj interesujących Cię rzeczy w spreadsheetach albo przejdź do naszych produktów i znajdź link do itemu.",
        visual: "browse",
        action: { label: "Przejdź do produktów", type: "section", target: "products" }
      },
      {
        title: "Dodaj do koszyka",
        description: "Wybierz odpowiedni kolor, rozmiar i ilość, a następnie dodaj produkt do koszyka na KakoBuy.",
        visual: "cart"
      },
      {
        title: "Złóż zamówienie",
        description: "Sprawdź koszyk, wybierz produkty i opłać koszt towarów oraz krajowej wysyłki w Chinach.",
        visual: "checkout"
      },
      {
        title: "Potwierdź i zapłać",
        description: "Zaznacz „I have read and agree” i kliknij „Buy Now”, aby przejść do płatności.",
        visual: "confirm"
      },
      {
        title: "Wybierz płatność",
        description: "Wybierz preferowaną metodę płatności i kliknij „Pay for Order”, aby sfinalizować zakup.",
        visual: "payment"
      },
      {
        title: "Realizacja zamówienia",
        description: "Po opłaceniu KakoBuy weryfikuje produkty i zamawia je u sprzedawców. Dostawa do magazynu trwa zwykle kilka dni.",
        visual: "plain1"
      },
      {
        title: "Kontrola jakości (QC)",
        description: "Po dotarciu produktów KakoBuy wykonuje kontrolę jakości i przesyła Ci zdjęcia do oceny.",
        visual: "qc"
      },
      {
        title: "Zleć wstępne ważenie",
        description: "Kiedy wszystkie produkty są już w magazynie, zleć wstępne ważenie paczki.",
        visual: "weigh"
      },
      {
        title: "Zleć wysyłkę",
        description: "Po ważeniu możesz zlecić wysyłkę międzynarodową swojej paczki.",
        visual: "plain2"
      },
      {
        title: "Wybierz metodę wysyłki",
        description: "Wybierz sposób dostawy, sprawdź orientacyjny czas i opłać koszty transportu.",
        visual: "shipping"
      },
      {
        title: "Odbierz paczkę",
        description: "Po otrzymaniu przesyłki sprawdź jej zawartość i potwierdź odbiór w panelu użytkownika.",
        visual: "plain3"
      },
      {
        title: "Gotowe!",
        description: "Gratulacje! Udało Ci się przejść cały proces. Dołącz do naszej społeczności na Discordzie, aby być na bieżąco.",
        visual: "done",
        action: { label: "Dołącz na Discorda", href: "https://discord.com/" }
      }
    ]
  };

  let currentStepIndex = 0;
  let pageConfettiOverlay = null;

  renderOverview();
  renderStep();

  backBtn.addEventListener("click", () => {
    player.classList.add("hidden");
    overview.classList.remove("hidden");
    removePageConfetti();
  });

  prevBtn.addEventListener("click", () => {
    if (currentStepIndex > 0) {
      currentStepIndex -= 1;
      renderStep();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentStepIndex < tutorial.steps.length - 1) {
      currentStepIndex += 1;
      renderStep();
    } else {
      currentStepIndex = 0;
      renderStep();
      player.classList.add("hidden");
      overview.classList.remove("hidden");
      removePageConfetti();
    }
  });

  restartBtn.addEventListener("click", () => {
    currentStepIndex = 0;
    renderStep();
    removePageConfetti();
  });

  function renderOverview() {
    overview.innerHTML = `
      <article class="tutorial-card-large">
        <span class="tutorial-card-kicker">TUTORIAL</span>
        <h3>${escapeHtml(tutorial.title)}</h3>
        <p>${escapeHtml(tutorial.subtitle)}</p>
        <button id="startKakoTutorial" class="tutorial-start-btn" type="button">Uruchom tutorial</button>
      </article>

      <article class="tutorial-small-card">
        <h4>Dowiesz się jak</h4>
        <p>
          Zamawiać i jak korzystać z naszych narzędzi krok po kroku.
        </p>
      </article>
    `;

    const startBtn = document.getElementById("startKakoTutorial");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        overview.classList.add("hidden");
        player.classList.remove("hidden");
        currentStepIndex = 0;
        renderStep();
        removePageConfetti();
      });
    }
  }

  function renderStep() {
    const step = tutorial.steps[currentStepIndex];
    const total = tutorial.steps.length;
    const progress = ((currentStepIndex + 1) / total) * 100;

    mainTitle.textContent = tutorial.title;
    mainSubtitle.textContent = tutorial.subtitle;
    stepBadge.textContent = String(currentStepIndex + 1);
    stepTitle.textContent = step.title;
    stepMeta.textContent = `Krok ${currentStepIndex + 1} z ${total}`;
    stepDescription.textContent = step.description;
    progressBar.style.width = `${progress}%`;

    topSteps.innerHTML = tutorial.steps
      .map((_, index) => {
        const active = index === currentStepIndex ? "active" : "";
        return `<button class="tutorial-step-dot ${active}" type="button" data-step-index="${index}">${index + 1}</button>`;
      })
      .join("");

    sideSteps.innerHTML = tutorial.steps
      .map((_, index) => {
        const active = index === currentStepIndex ? "active" : "";
        return `<button class="tutorial-side-dot ${active}" type="button" data-side-step-index="${index}">${index + 1}</button>`;
      })
      .join("");

    stepMedia.innerHTML = renderTutorialVisual(step, currentStepIndex + 1);
    stepActions.innerHTML = renderStepAction(step);

    topSteps.querySelectorAll("[data-step-index]").forEach((button) => {
      button.addEventListener("click", () => {
        currentStepIndex = Number(button.getAttribute("data-step-index"));
        renderStep();
      });
    });

    sideSteps.querySelectorAll("[data-side-step-index]").forEach((button) => {
      button.addEventListener("click", () => {
        currentStepIndex = Number(button.getAttribute("data-side-step-index"));
        renderStep();
      });
    });

    stepActions.querySelectorAll("[data-action-section]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-action-section");
        if (typeof window.showSection === "function") {
          window.showSection(target);
        }
      });
    });

    prevBtn.disabled = currentStepIndex === 0;
    prevBtn.style.opacity = currentStepIndex === 0 ? "0.45" : "1";

    if (currentStepIndex === total - 1) {
      nextBtn.textContent = "Ukończ ✓";
      nextBtn.className = "tutorial-success-btn";
      launchPageConfetti();
    } else {
      nextBtn.textContent = "Dalej ›";
      nextBtn.className = "tutorial-primary-btn";
      removePageConfetti();
    }
  }

  function launchPageConfetti() {
    removePageConfetti();

    pageConfettiOverlay = document.createElement("div");
    pageConfettiOverlay.className = "page-confetti-overlay";

    const colors = [
  "#ff3a2f", // czerwony
  "#ffb800", // żółty
  "#22c55e", // zielony
  "#3b82f6", // niebieski
  "#a855f7", // fiolet
  "#ff6ec7", // różowy
  "#00d4ff"  // neon cyan
];
    const count = 120;

    for (let index = 0; index < count; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty("--drift", `${Math.random() * 280 - 140}px`);
      piece.style.animationDelay = `${Math.random() * 500}ms`;
      piece.style.transform = `translate3d(0,0,0) rotate(${Math.random() * 180}deg)`;
      piece.style.width = `${8 + Math.random() * 7}px`;
      piece.style.height = `${10 + Math.random() * 10}px`;
      pageConfettiOverlay.appendChild(piece);
    }

    document.body.appendChild(pageConfettiOverlay);

    setTimeout(() => {
      removePageConfetti();
    }, 3000);
  }

  function removePageConfetti() {
    if (pageConfettiOverlay && pageConfettiOverlay.parentNode) {
      pageConfettiOverlay.parentNode.removeChild(pageConfettiOverlay);
    }
    pageConfettiOverlay = null;
  }
};

function renderStepAction(step) {
  if (!step.action) return "";

  if (step.action.type === "section") {
    return `
      <button class="tutorial-inline-btn" type="button" data-action-section="${escapeHtml(step.action.target)}">
        ${escapeHtml(step.action.label)}
      </button>
    `;
  }

  if (step.action.href) {
    return `
      <a class="tutorial-inline-btn" href="${escapeHtml(step.action.href)}" target="_blank" rel="noreferrer">
        ${escapeHtml(step.action.label)}
      </a>
    `;
  }

  return "";
}

function renderTutorialVisual(step, stepNumber) {
  const commonHeader = `
    <div class="tutorial-shot-browser-top">
      <span></span><span></span><span></span>
    </div>
  `;

  switch (step.visual) {
    case "register":
      return `
        <div class="tutorial-shot">
          ${commonHeader}
          <div class="tutorial-mock-grid">
            <div class="tutorial-mock-panel">
              <div class="tutorial-label-chip">Konto / Rejestracja</div>
              <div class="tutorial-mock-title"></div>
              <div class="tutorial-mock-lines">
                <span style="width:88%"></span>
                <span style="width:72%"></span>
                <span style="width:60%"></span>
              </div>
              <div class="tutorial-mock-image"></div>
            </div>
            <div class="tutorial-mock-side">
              <div class="tutorial-mock-title" style="width:80%"></div>
              <div class="tutorial-mock-lines">
                <span style="width:100%"></span>
                <span style="width:100%"></span>
                <span style="width:100%"></span>
                <span style="width:65%"></span>
              </div>
            </div>
          </div>
        </div>
      `;

    case "browse":
      return `
        <div class="tutorial-shot tutorial-shot-dark">
          ${commonHeader}
          <div class="tutorial-mock-panel">
            <div class="tutorial-label-chip">Spreadsheet / Products</div>
            <div class="tutorial-mock-title" style="width:48%"></div>
            <div class="tutorial-mock-lines">
              <span style="width:82%"></span>
              <span style="width:66%"></span>
            </div>
            <div class="tutorial-mock-image dark"></div>
          </div>
        </div>
      `;

    case "cart":
      return mockArrowShot("Dodawanie do koszyka", "Dodaj wybrany rozmiar i kliknij Add to cart / Add shopping cart.");
    case "checkout":
      return mockArrowShot("Podsumowanie koszyka", "Przejdź dalej z poziomu koszyka i sprawdź kwoty produktu.");
    case "confirm":
      return mockArrowShot("Potwierdzenie zamówienia", "Zaznacz zgodę i kliknij przycisk finalizacji.");
    case "payment":
      return mockArrowShot("Płatność", "Wybierz metodę i potwierdź opłacenie zamówienia.");
    case "qc":
      return mockArrowShot("QC / Warehouse", "Po przyjęciu do magazynu sprawdź zdjęcia i jakość produktu.");
    case "weigh":
      return mockArrowShot("Ważenie", "Zleć wstępne ważenie, gdy wszystkie produkty są już na warehouse.");
    case "shipping":
      return mockArrowShot("Shipping line", "Wybierz linię wysyłki i potwierdź submit.");
    case "plain1":
      return `
        <div class="tutorial-shot-plain">
          <p>KakoBuy kupuje produkty u sellerów i dostarcza je do swojego magazynu. Ten etap trwa zwykle kilka dni i nie wymaga od Ciebie żadnej akcji.</p>
        </div>
      `;
    case "plain2":
      return `
        <div class="tutorial-shot-plain">
          <p>Po ważeniu przechodzisz do etapu wysyłki międzynarodowej. Tutaj decydujesz, kiedy paczka ma zostać wysłana do Ciebie.</p>
        </div>
      `;
    case "plain3":
      return `
        <div class="tutorial-shot-plain">
          <p>Gdy paczka dotrze, sprawdź stan rzeczy, zachowaj zdjęcia i potwierdź, że wszystko jest okej. Potem możesz wracać po kolejne finds.</p>
        </div>
      `;
    case "done":
      return `
        <div class="tutorial-shot-plain">
          <p>Masz to. Cały flow od rejestracji do odbioru paczki jest ukończony. Na końcu odpalamy celebrację na całą stronę.</p>
        </div>
      `;
    default:
      return `
        <div class="tutorial-shot-plain">
          <p>Krok ${stepNumber}</p>
        </div>
      `;
  }
}

function mockArrowShot(label, text) {
  return `
    <div class="tutorial-shot">
      <div class="tutorial-shot-browser-top">
        <span></span><span></span><span></span>
      </div>
      <div class="tutorial-label-chip">${escapeHtml(label)}</div>
      <div class="tutorial-mock-grid">
        <div class="tutorial-mock-panel">
          <div class="tutorial-mock-title" style="width:58%"></div>
          <div class="tutorial-mock-lines">
            <span style="width:72%"></span>
            <span style="width:64%"></span>
            <span style="width:54%"></span>
          </div>
          <div class="tutorial-mock-image gray"></div>
        </div>
        <div class="tutorial-mock-side">
          <div class="tutorial-mock-title" style="width:72%"></div>
          <div class="tutorial-mock-lines">
            <span style="width:100%"></span>
            <span style="width:88%"></span>
            <span style="width:74%"></span>
            <span style="width:62%"></span>
          </div>
        </div>
      </div>
      <div class="tutorial-arrow" style="left: 34%; top: 62%;"></div>
      <div style="margin-top:14px;color:#6d7785;font-weight:700;">${escapeHtml(text)}</div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}