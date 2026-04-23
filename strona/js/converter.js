// --- converter.js ---

window.detectPlatform = function(url) {
  const value = String(url || "").toLowerCase();

  if (!value) return "auto";
  if (value.includes("weidian.com")) return "weidian";
  if (value.includes("kakobuy.com") || value.includes("m.kakobuy.com")) return "kakobuy";
  if (value.includes("usfans.com")) return "usfans";
  if (value.includes("acbuy.com") || value.includes("allchinabuy.com")) return "allchinabuy";
  if (value.includes("litbuy.com")) return "litbuy";
  return "unknown";
};

window.normalizeUrl = function(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return raw;
};

window.safeUrl = function(value) {
  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
};

window.deepDecode = function(value, rounds = 4) {
  let result = String(value || "");
  for (let i = 0; i < rounds; i += 1) {
    try {
      const decoded = decodeURIComponent(result);
      if (decoded === result) break;
      result = decoded;
    } catch (error) {
      break;
    }
  }
  return result;
};

window.extractOriginalUrlFromAnyAgent = function(inputUrl) {
  const normalized = window.normalizeUrl(inputUrl);
  const url = window.safeUrl(normalized);

  if (!url) {
    return window.extractWeidianLikeUrlFromText(normalized);
  }

  const candidateKeys = ["url", "itemUrl", "goodsUrl", "link", "target", "redirect", "redirectUrl", "shopUrl"];

  for (const key of candidateKeys) {
    const value = url.searchParams.get(key);
    if (!value) continue;

    const deep = window.deepDecode(value);
    const directFound = window.extractWeidianLikeUrlFromText(deep);
    if (directFound) return directFound;

    const normalizedValue = window.normalizeUrl(deep);
    if (normalizedValue.startsWith("http")) return normalizedValue;
  }

  return window.extractWeidianLikeUrlFromText(normalized);
};

window.extractWeidianLikeUrlFromText = function(value) {
  const decoded = window.deepDecode(String(value || ""));
  const weidianMatch = decoded.match(/https?:\/\/(?:www\.)?weidian\.com\/item\.html\?[^ \n\r"'<>]*/i);
  if (weidianMatch) return window.cleanupExtractedUrl(weidianMatch[0]);

  const genericUrlMatch = decoded.match(/https?:\/\/[^ \n\r"'<>]+/i);
  if (genericUrlMatch) return window.cleanupExtractedUrl(genericUrlMatch[0]);

  return "";
};

window.cleanupExtractedUrl = function(url) {
  let cleaned = String(url || "").trim();
  cleaned = cleaned.replace(/&affcode=[^&]+/gi, "");
  cleaned = cleaned.replace(/[),.;]+$/g, "");

  const itemId = window.extractWeidianItemId(cleaned);
  if (itemId) return window.buildWeidianUrl(itemId);

  return cleaned;
};

window.extractAnyKnownItemId = function(rawInput, extractedOriginalUrl) {
  return (
    window.extractWeidianItemId(extractedOriginalUrl) ||
    window.extractWeidianItemId(rawInput) ||
    window.extractKakoBuyItemId(rawInput) ||
    window.extractUsFansItemId(rawInput) ||
    window.extractAllChinaBuyItemId(rawInput) ||
    window.extractLitBuyItemId(rawInput) ||
    ""
  );
};

window.extractWeidianItemId = function(url) {
  const safe = window.safeUrl(url);
  if (safe) {
    const itemId =
      safe.searchParams.get("itemID") ||
      safe.searchParams.get("itemId") ||
      safe.searchParams.get("id");

    if (itemId && /^\d+$/.test(itemId)) return itemId;
  }

  const match = String(url || "").match(/itemID(?:%3D|=)(\d+)/i);
  return match ? match[1] : "";
};

window.extractKakoBuyItemId = function(url) {
  const embedded = window.extractOriginalUrlFromAnyAgent(url);
  const embeddedId = window.extractWeidianItemId(embedded);
  if (embeddedId) return embeddedId;

  const match = String(url || "").match(/itemID%3D(\d+)/i);
  return match ? match[1] : "";
};

window.extractUsFansItemId = function(url) {
  const match = String(url || "").match(/\/product\/\d+\/(\d+)/i);
  return match ? match[1] : "";
};

window.extractAllChinaBuyItemId = function(url) {
  const safe = window.safeUrl(url);
  if (!safe) return "";
  const id = safe.searchParams.get("id");
  if (id && /^\d+$/.test(id)) return id;
  return "";
};

window.extractSourceCode = function(url) {
  const safe = window.safeUrl(url);
  if (!safe) return "";
  return String(safe.searchParams.get("source") || "").toUpperCase();
};

window.extractLitBuyItemId = function(url) {
  const match = String(url || "").match(/\/product\/[a-z0-9_-]+\/(\d+)/i);
  return match ? match[1] : "";
};

window.extractLitBuySource = function(url) {
  const match = String(url || "").match(/\/product\/([a-z0-9_-]+)\//i);
  if (!match) return "unknown";
  const source = match[1].toLowerCase();
  if (source === "weidian") return "weidian";
  return source;
};

window.buildWeidianUrl = function(itemId) {
  return `https://weidian.com/item.html?itemID=${itemId}`;
};

window.analyzeInput = function(rawUrl) {
  const cleaned = window.normalizeUrl(rawUrl);

  if (!cleaned) {
    return { displaySource: "auto", originalPlatform: "unknown", originalUrl: "", itemId: "", sourceCode: "" };
  }

  const platform = window.detectPlatform(cleaned);

  if (platform === "weidian") {
    const itemId = window.extractWeidianItemId(cleaned);
    return {
      displaySource: "weidian", originalPlatform: "weidian", originalUrl: itemId ? window.buildWeidianUrl(itemId) : cleaned, itemId, sourceCode: "WD"
    };
  }

  if (platform === "kakobuy") {
    const embeddedOriginal = window.extractOriginalUrlFromAnyAgent(cleaned);
    const itemId = window.extractAnyKnownItemId(cleaned, embeddedOriginal);
    const originalUrl = itemId ? window.buildWeidianUrl(itemId) : embeddedOriginal;
    return {
      displaySource: "kakobuy", originalPlatform: itemId ? "weidian" : window.detectPlatform(originalUrl), originalUrl: originalUrl || "", itemId, sourceCode: itemId ? "WD" : ""
    };
  }

  if (platform === "usfans") {
    const itemId = window.extractUsFansItemId(cleaned);
    return {
      displaySource: "usfans", originalPlatform: itemId ? "weidian" : "unknown", originalUrl: itemId ? window.buildWeidianUrl(itemId) : "", itemId, sourceCode: itemId ? "WD" : ""
    };
  }

  if (platform === "allchinabuy") {
    const itemId = window.extractAllChinaBuyItemId(cleaned);
    const sourceCode = window.extractSourceCode(cleaned) || (itemId ? "WD" : "");
    return {
      displaySource: "allchinabuy", originalPlatform: itemId && sourceCode === "WD" ? "weidian" : "unknown", originalUrl: itemId && sourceCode === "WD" ? window.buildWeidianUrl(itemId) : "", itemId, sourceCode
    };
  }

  if (platform === "litbuy") {
    const itemId = window.extractLitBuyItemId(cleaned);
    const sourcePlatform = window.extractLitBuySource(cleaned);
    return {
      displaySource: "litbuy", originalPlatform: itemId && sourcePlatform === "weidian" ? "weidian" : sourcePlatform, originalUrl: itemId && sourcePlatform === "weidian" ? window.buildWeidianUrl(itemId) : "", itemId, sourceCode: itemId && sourcePlatform === "weidian" ? "WD" : ""
    };
  }

  return { displaySource: platform, originalPlatform: platform, originalUrl: cleaned, itemId: window.extractWeidianItemId(cleaned), sourceCode: platform === "weidian" ? "WD" : "" };
};

window.buildConvertedResult = function(analysis, target) {
  const itemId = analysis.itemId;
  const sourcePlatform = analysis.originalPlatform;

  if (!analysis.originalUrl) return { url: "" };

  if (target === "weidian") {
    if (itemId) return { url: window.buildWeidianUrl(itemId) };
    if (sourcePlatform === "weidian") return { url: analysis.originalUrl };
    return { url: "" };
  }

  if (!itemId || sourcePlatform !== "weidian") {
    if (target === "kakobuy" && analysis.originalUrl.startsWith("http")) {
      return { url: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(analysis.originalUrl)}&affcode=xfrostyy` };
    }
    return { url: "" };
  }

  switch (target) {
    case "kakobuy": return { url: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(window.buildWeidianUrl(itemId))}&affcode=xfrostyy` };
    case "usfans": return { url: `https://www.usfans.com/product/3/${itemId}` };
    case "allchinabuy": return { url: `https://www.acbuy.com/product/?id=${encodeURIComponent(itemId)}&source=WD` };
    case "litbuy": return { url: `https://litbuy.com/product/weidian/${encodeURIComponent(itemId)}?` };
    default: return { url: "" };
  }
};

window.setResult = function(payload) {
  const output = document.getElementById("converterOutput");
  const originalBadge = document.getElementById("converterOriginalBadge");
  const convertedBadge = document.getElementById("converterConvertedBadge");
  const originalUrlBox = document.getElementById("converterOriginalUrl");

  if (!output || !originalBadge || !convertedBadge || !originalUrlBox) return;

  const originalPlatform = payload.originalPlatform || "unknown";
  const convertedPlatform = payload.convertedPlatform || "unknown";

  originalUrlBox.textContent = payload.originalUrl || "Brak danych";
  output.textContent = payload.convertedUrl || "Brak wyniku";

  originalBadge.className = `platform-pill ${window.platformClassName(originalPlatform)}`;
  convertedBadge.className = `platform-pill ${window.platformClassName(convertedPlatform)}`;

  originalBadge.textContent = window.formatPlatformLabel(originalPlatform);
  convertedBadge.textContent = window.formatPlatformLabel(convertedPlatform);
};

window.setStatus = function(message) {
  const status = document.getElementById("converterStatus");
  if (status) status.textContent = message;
};

window.platformClassName = function(platform) {
  const map = {
    weidian: "platform-pill-weidian",
    kakobuy: "platform-pill-kakobuy",
    usfans: "platform-pill-usfans",
    litbuy: "platform-pill-litbuy",
    allchinabuy: "platform-pill-allchinabuy"
  };
  return map[platform] || "platform-pill-neutral";
};

window.formatPlatformLabel = function(platform) {
  const map = {
    auto: "Auto detect", unknown: "Unknown", weidian: "Weidian",
    kakobuy: "KakoBuy", usfans: "UsFans", litbuy: "LITBUY", allchinabuy: "AllChinaBuy"
  };
  return map[platform] || String(platform || "Unknown");
};

window.updateSourceLabel = function(source) {
  const sourceLabel = document.getElementById("converterSourceLabel");
  if (!sourceLabel) return;
  sourceLabel.textContent = source === "auto" ? "Auto detect" : window.formatPlatformLabel(source);
};

window.copyTextConverter = function(value, btnElement) {
  const text = String(value || "").trim();
  if (!text || text === "Brak wyniku" || text === "Brak danych") return;
  
  navigator.clipboard.writeText(text).then(() => {
    if (btnElement) {
      const textSpan = btnElement.querySelector('.copy-text') || btnElement;
      const originalText = textSpan.innerText;
      textSpan.innerText = "Skopiowano!";
      setTimeout(() => { textSpan.innerText = originalText; }, 1500);
    }
  }).catch((err) => console.error("Błąd kopiowania", err));
};

window.openLink = function(value) {
  const text = String(value || "").trim();
  if (!text || !text.startsWith("http")) return;
  window.open(text, "_blank", "noopener,noreferrer");
};

window.revealResultSection = function(section, hasShownBefore) {
  const wasHidden = section.classList.contains("hidden");
  section.classList.remove("hidden");

  if (wasHidden || !hasShownBefore) {
    section.animate([
      { opacity: 0, transform: "translateY(18px)" },
      { opacity: 1, transform: "translateY(0)" }
    ], { duration: 380, easing: "ease-out", fill: "both" });
  }

  requestAnimationFrame(() => {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

window.escapeHtmlConverter = function(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

// GŁÓWNA FUNKCJA INICJALIZACJI
window.initConverter = function () {
  const input = document.getElementById("converterInput");
  const convertBtn = document.getElementById("convertBtn");
  const copyConverted = document.getElementById("copyConverted");
  const openConverted = document.getElementById("openConverted");
  const copyOriginal = document.getElementById("copyOriginal");
  const openOriginal = document.getElementById("openOriginal");
  const output = document.getElementById("converterOutput");
  const status = document.getElementById("converterStatus");
  const originalBadge = document.getElementById("converterOriginalBadge");
  const convertedBadge = document.getElementById("converterConvertedBadge");
  const originalUrlBox = document.getElementById("converterOriginalUrl");
  const resultSection = document.getElementById("converter-result");

  const sourceLabel = document.getElementById("converterSourceLabel");
  const targetLabel = document.getElementById("converterTargetLabel");
  const targetSelectWrap = document.getElementById("converterTargetSelect");
  const targetButton = document.getElementById("converterTargetButton");
  const targetMenu = document.getElementById("converterTargetMenu");

  if (!input || !convertBtn || !resultSection || !targetSelectWrap) {
    console.error("Converter init failed: brak HTML konwertera");
    return;
  }

  let hasShownResultOnce = false;
  let selectedTarget = "kakobuy";

  const targets = [
    { value: "kakobuy", label: "KakoBuy" },
    { value: "usfans", label: "UsFans" },
    { value: "litbuy", label: "LITBUY" },
    { value: "allchinabuy", label: "AllChinaBuy" },
    { value: "weidian", label: "Weidian" }
  ];

  function buildTargetMenu() {
    targetMenu.innerHTML = targets.map((target) => {
        const active = target.value === selectedTarget ? "active" : "";
        return `<button type="button" class="converter-dropdown-item ${active}" data-target-value="${window.escapeHtmlConverter(target.value)}">
            ${window.escapeHtmlConverter(target.label)}
          </button>`;
      }).join("");

    targetLabel.textContent = window.formatPlatformLabel(selectedTarget);

    targetMenu.querySelectorAll("[data-target-value]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedTarget = button.getAttribute("data-target-value");
        targetLabel.textContent = window.formatPlatformLabel(selectedTarget);
        buildTargetMenu();
        targetSelectWrap.classList.remove("open");
      });
    });
  }

  buildTargetMenu();
  window.updateSourceLabel("auto");
  resultSection.classList.add("hidden");

  input.addEventListener("input", () => {
    const analysis = window.analyzeInput(input.value.trim());
    window.updateSourceLabel(analysis.displaySource);
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") convertBtn.click();
  });

  targetButton.addEventListener("click", (event) => {
    event.stopPropagation();
    targetSelectWrap.classList.toggle("open");
  });

  document.addEventListener("click", (event) => {
    if (!targetSelectWrap.contains(event.target)) {
      targetSelectWrap.classList.remove("open");
    }
  });

  convertBtn.addEventListener("click", () => {
    const raw = input.value.trim();

    if (!raw) {
      resultSection.classList.add("hidden");
      window.setStatus("Wklej link, żeby rozpocząć konwersję.");
      return;
    }

    const analysis = window.analyzeInput(raw);
    window.updateSourceLabel(analysis.displaySource);

    if (!analysis.originalUrl) {
      window.setResult({ originalPlatform: "unknown", originalUrl: raw, convertedPlatform: selectedTarget, convertedUrl: "" });
      window.setStatus("Nie udało się odczytać poprawnego linku źródłowego.");
      window.revealResultSection(resultSection, hasShownResultOnce);
      hasShownResultOnce = true;
      return;
    }

    const converted = window.buildConvertedResult(analysis, selectedTarget);

    if (!converted.url) {
      window.setResult({ originalPlatform: analysis.originalPlatform, originalUrl: analysis.originalUrl, convertedPlatform: selectedTarget, convertedUrl: "" });
      window.setStatus(`Nie udało się zbudować poprawnego linku ${window.formatPlatformLabel(selectedTarget)} dla tego formatu.`);
      window.revealResultSection(resultSection, hasShownResultOnce);
      hasShownResultOnce = true;
      return;
    }

    window.setResult({ originalPlatform: analysis.originalPlatform, originalUrl: analysis.originalUrl, convertedPlatform: selectedTarget, convertedUrl: converted.url });
    window.setStatus(`Gotowe: ${window.formatPlatformLabel(analysis.originalPlatform)} → ${window.formatPlatformLabel(selectedTarget)}`);
    window.revealResultSection(resultSection, hasShownResultOnce);
    hasShownResultOnce = true;
  });

  if (copyConverted) {
    copyConverted.addEventListener("click", function() { window.copyTextConverter(output.textContent, this); });
  }
  if (openConverted) {
    openConverted.addEventListener("click", () => window.openLink(output.textContent));
  }
  if (copyOriginal) {
    copyOriginal.addEventListener("click", function() { window.copyTextConverter(originalUrlBox.textContent, this); });
  }
  if (openOriginal) {
    openOriginal.addEventListener("click", () => window.openLink(originalUrlBox.textContent));
  }
};