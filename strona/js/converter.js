window.initConverter = function () {
  const input = document.getElementById("converterInput");
  const convertBtn = document.getElementById("convertBtn");
  const copyConvertedTop = document.getElementById("copyConvertedTop");
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

  if (
    !input ||
    !convertBtn ||
    !output ||
    !status ||
    !originalBadge ||
    !convertedBadge ||
    !originalUrlBox ||
    !resultSection ||
    !sourceLabel ||
    !targetLabel ||
    !targetSelectWrap ||
    !targetButton ||
    !targetMenu
  ) {
    console.error("Converter init failed: missing HTML elements");
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

  buildTargetMenu();
  updateSourceLabel("auto");
  resultSection.classList.add("hidden");

  input.addEventListener("input", () => {
    const analysis = analyzeInput(input.value.trim());
    updateSourceLabel(analysis.displaySource);
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
      setStatus("Wklej link, żeby rozpocząć konwersję.");
      return;
    }

    const analysis = analyzeInput(raw);
    updateSourceLabel(analysis.displaySource);

    if (!analysis.originalUrl) {
      setResult({
        originalPlatform: "unknown",
        originalUrl: raw,
        convertedPlatform: selectedTarget,
        convertedUrl: ""
      });

      setStatus("Nie udało się odczytać poprawnego linku źródłowego.");
      revealResultSection(resultSection, hasShownResultOnce);
      hasShownResultOnce = true;
      return;
    }

    const converted = buildConvertedResult(analysis, selectedTarget);

    if (!converted.url) {
      setResult({
        originalPlatform: analysis.originalPlatform,
        originalUrl: analysis.originalUrl,
        convertedPlatform: selectedTarget,
        convertedUrl: ""
      });

      setStatus(`Nie udało się zbudować poprawnego linku ${formatPlatformLabel(selectedTarget)} dla tego formatu.`);
      revealResultSection(resultSection, hasShownResultOnce);
      hasShownResultOnce = true;
      return;
    }

    setResult({
      originalPlatform: analysis.originalPlatform,
      originalUrl: analysis.originalUrl,
      convertedPlatform: selectedTarget,
      convertedUrl: converted.url
    });

    setStatus(`Gotowe: ${formatPlatformLabel(analysis.originalPlatform)} → ${formatPlatformLabel(selectedTarget)}`);
    revealResultSection(resultSection, hasShownResultOnce);
    hasShownResultOnce = true;
  });

  if (copyConvertedTop) {
    copyConvertedTop.addEventListener("click", () => copyText(output.textContent));
  }

  if (copyConverted) {
    copyConverted.addEventListener("click", () => copyText(output.textContent));
  }

  if (openConverted) {
    openConverted.addEventListener("click", () => openLink(output.textContent));
  }

  if (copyOriginal) {
    copyOriginal.addEventListener("click", () => copyText(originalUrlBox.textContent));
  }

  if (openOriginal) {
    openOriginal.addEventListener("click", () => openLink(originalUrlBox.textContent));
  }

  function buildTargetMenu() {
    targetMenu.innerHTML = targets
      .map((target) => {
        const active = target.value === selectedTarget ? "active" : "";
        return `
          <button
            type="button"
            class="converter-select-option ${active}"
            data-target-value="${escapeHtml(target.value)}"
          >
            ${escapeHtml(target.label)}
          </button>
        `;
      })
      .join("");

    targetLabel.textContent = formatPlatformLabel(selectedTarget);

    targetMenu.querySelectorAll("[data-target-value]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedTarget = button.getAttribute("data-target-value");
        targetLabel.textContent = formatPlatformLabel(selectedTarget);
        buildTargetMenu();
        targetSelectWrap.classList.remove("open");
      });
    });
  }
};

function updateSourceLabel(source) {
  const sourceLabel = document.getElementById("converterSourceLabel");
  if (!sourceLabel) return;
  sourceLabel.textContent = source === "auto" ? "Auto detect" : formatPlatformLabel(source);
}

function analyzeInput(rawUrl) {
  const cleaned = normalizeUrl(rawUrl);

  if (!cleaned) {
    return {
      displaySource: "auto",
      originalPlatform: "unknown",
      originalUrl: "",
      itemId: "",
      sourceCode: ""
    };
  }

  const platform = detectPlatform(cleaned);

  if (platform === "weidian") {
    const itemId = extractWeidianItemId(cleaned);
    return {
      displaySource: "weidian",
      originalPlatform: "weidian",
      originalUrl: itemId ? buildWeidianUrl(itemId) : cleaned,
      itemId,
      sourceCode: "WD"
    };
  }

  if (platform === "kakobuy") {
    const embeddedOriginal = extractOriginalUrlFromAnyAgent(cleaned);
    const itemId = extractAnyKnownItemId(cleaned, embeddedOriginal);
    const originalUrl = itemId ? buildWeidianUrl(itemId) : embeddedOriginal;

    return {
      displaySource: "kakobuy",
      originalPlatform: itemId ? "weidian" : detectPlatform(originalUrl),
      originalUrl: originalUrl || "",
      itemId,
      sourceCode: itemId ? "WD" : ""
    };
  }

  if (platform === "usfans") {
    const itemId = extractUsFansItemId(cleaned);
    return {
      displaySource: "usfans",
      originalPlatform: itemId ? "weidian" : "unknown",
      originalUrl: itemId ? buildWeidianUrl(itemId) : "",
      itemId,
      sourceCode: itemId ? "WD" : ""
    };
  }

  if (platform === "allchinabuy") {
    const itemId = extractAllChinaBuyItemId(cleaned);
    const sourceCode = extractSourceCode(cleaned) || (itemId ? "WD" : "");
    return {
      displaySource: "allchinabuy",
      originalPlatform: itemId && sourceCode === "WD" ? "weidian" : "unknown",
      originalUrl: itemId && sourceCode === "WD" ? buildWeidianUrl(itemId) : "",
      itemId,
      sourceCode
    };
  }

  if (platform === "litbuy") {
    const itemId = extractLitBuyItemId(cleaned);
    const sourcePlatform = extractLitBuySource(cleaned);
    return {
      displaySource: "litbuy",
      originalPlatform: itemId && sourcePlatform === "weidian" ? "weidian" : sourcePlatform,
      originalUrl: itemId && sourcePlatform === "weidian" ? buildWeidianUrl(itemId) : "",
      itemId,
      sourceCode: itemId && sourcePlatform === "weidian" ? "WD" : ""
    };
  }

  return {
    displaySource: platform,
    originalPlatform: platform,
    originalUrl: cleaned,
    itemId: extractWeidianItemId(cleaned),
    sourceCode: platform === "weidian" ? "WD" : ""
  };
}

function buildConvertedResult(analysis, target) {
  const itemId = analysis.itemId;
  const sourcePlatform = analysis.originalPlatform;

  if (!analysis.originalUrl) {
    return { url: "" };
  }

  if (target === "weidian") {
    if (itemId) return { url: buildWeidianUrl(itemId) };
    if (sourcePlatform === "weidian") return { url: analysis.originalUrl };
    return { url: "" };
  }

  if (!itemId || sourcePlatform !== "weidian") {
    if (target === "kakobuy" && analysis.originalUrl.startsWith("http")) {
      return {
        url: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(analysis.originalUrl)}`
      };
    }
    return { url: "" };
  }

  switch (target) {
    case "kakobuy":
      return { url: `https://www.kakobuy.com/item/details?url=${encodeURIComponent(buildWeidianUrl(itemId))}` };
    case "usfans":
      return { url: `https://www.usfans.com/product/3/${itemId}` };
    case "allchinabuy":
      return { url: `https://www.acbuy.com/product/?id=${encodeURIComponent(itemId)}&source=WD` };
    case "litbuy":
      return { url: `https://litbuy.com/product/weidian/${encodeURIComponent(itemId)}?` };
    default:
      return { url: "" };
  }
}

function detectPlatform(url) {
  const value = String(url || "").toLowerCase();

  if (!value) return "auto";
  if (value.includes("weidian.com")) return "weidian";
  if (value.includes("kakobuy.com") || value.includes("m.kakobuy.com")) return "kakobuy";
  if (value.includes("usfans.com")) return "usfans";
  if (value.includes("acbuy.com") || value.includes("allchinabuy.com")) return "allchinabuy";
  if (value.includes("litbuy.com")) return "litbuy";
  return "unknown";
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return raw;
}

function extractOriginalUrlFromAnyAgent(inputUrl) {
  const normalized = normalizeUrl(inputUrl);
  const url = safeUrl(normalized);

  if (!url) {
    return extractWeidianLikeUrlFromText(normalized);
  }

  const candidateKeys = ["url", "itemUrl", "goodsUrl", "link", "target", "redirect", "redirectUrl", "shopUrl"];

  for (const key of candidateKeys) {
    const value = url.searchParams.get(key);
    if (!value) continue;

    const deep = deepDecode(value);
    const directFound = extractWeidianLikeUrlFromText(deep);
    if (directFound) return directFound;

    const normalizedValue = normalizeUrl(deep);
    if (normalizedValue.startsWith("http")) return normalizedValue;
  }

  return extractWeidianLikeUrlFromText(normalized);
}

function extractWeidianLikeUrlFromText(value) {
  const decoded = deepDecode(String(value || ""));
  const weidianMatch = decoded.match(/https?:\/\/(?:www\.)?weidian\.com\/item\.html\?[^ \n\r"'<>]*/i);
  if (weidianMatch) return cleanupExtractedUrl(weidianMatch[0]);

  const genericUrlMatch = decoded.match(/https?:\/\/[^ \n\r"'<>]+/i);
  if (genericUrlMatch) return cleanupExtractedUrl(genericUrlMatch[0]);

  return "";
}

function cleanupExtractedUrl(url) {
  let cleaned = String(url || "").trim();
  cleaned = cleaned.replace(/&affcode=[^&]+/gi, "");
  cleaned = cleaned.replace(/[),.;]+$/g, "");

  const itemId = extractWeidianItemId(cleaned);
  if (itemId) return buildWeidianUrl(itemId);

  return cleaned;
}

function extractAnyKnownItemId(rawInput, extractedOriginalUrl) {
  return (
    extractWeidianItemId(extractedOriginalUrl) ||
    extractWeidianItemId(rawInput) ||
    extractKakoBuyItemId(rawInput) ||
    extractUsFansItemId(rawInput) ||
    extractAllChinaBuyItemId(rawInput) ||
    extractLitBuyItemId(rawInput) ||
    ""
  );
}

function extractWeidianItemId(url) {
  const safe = safeUrl(url);
  if (safe) {
    const itemId =
      safe.searchParams.get("itemID") ||
      safe.searchParams.get("itemId") ||
      safe.searchParams.get("id");

    if (itemId && /^\d+$/.test(itemId)) return itemId;
  }

  const match = String(url || "").match(/itemID(?:%3D|=)(\d+)/i);
  return match ? match[1] : "";
}

function extractKakoBuyItemId(url) {
  const embedded = extractOriginalUrlFromAnyAgent(url);
  const embeddedId = extractWeidianItemId(embedded);
  if (embeddedId) return embeddedId;

  const match = String(url || "").match(/itemID%3D(\d+)/i);
  return match ? match[1] : "";
}

function extractUsFansItemId(url) {
  const match = String(url || "").match(/\/product\/\d+\/(\d+)/i);
  return match ? match[1] : "";
}

function extractAllChinaBuyItemId(url) {
  const safe = safeUrl(url);
  if (!safe) return "";
  const id = safe.searchParams.get("id");
  if (id && /^\d+$/.test(id)) return id;
  return "";
}

function extractSourceCode(url) {
  const safe = safeUrl(url);
  if (!safe) return "";
  return String(safe.searchParams.get("source") || "").toUpperCase();
}

function extractLitBuyItemId(url) {
  const match = String(url || "").match(/\/product\/[a-z0-9_-]+\/(\d+)/i);
  return match ? match[1] : "";
}

function extractLitBuySource(url) {
  const match = String(url || "").match(/\/product\/([a-z0-9_-]+)\//i);
  if (!match) return "unknown";
  const source = match[1].toLowerCase();
  if (source === "weidian") return "weidian";
  return source;
}

function buildWeidianUrl(itemId) {
  return `https://weidian.com/item.html?itemID=${itemId}`;
}

function safeUrl(value) {
  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
}

function deepDecode(value, rounds = 4) {
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
}

function setResult(payload) {
  const output = document.getElementById("converterOutput");
  const originalBadge = document.getElementById("converterOriginalBadge");
  const convertedBadge = document.getElementById("converterConvertedBadge");
  const originalUrlBox = document.getElementById("converterOriginalUrl");

  if (!output || !originalBadge || !convertedBadge || !originalUrlBox) return;

  const originalPlatform = payload.originalPlatform || "unknown";
  const convertedPlatform = payload.convertedPlatform || "unknown";

  originalUrlBox.textContent = payload.originalUrl || "Brak danych";
  output.textContent = payload.convertedUrl || "Brak wyniku";

  originalBadge.className = `platform-pill ${platformClassName(originalPlatform)}`;
  convertedBadge.className = `platform-pill ${platformClassName(convertedPlatform)}`;

  originalBadge.textContent = formatPlatformLabel(originalPlatform);
  convertedBadge.textContent = formatPlatformLabel(convertedPlatform);
}

function setStatus(message) {
  const status = document.getElementById("converterStatus");
  if (status) status.textContent = message;
}

function platformClassName(platform) {
  const map = {
    weidian: "platform-pill-weidian",
    kakobuy: "platform-pill-kakobuy",
    usfans: "platform-pill-usfans",
    litbuy: "platform-pill-litbuy",
    allchinabuy: "platform-pill-allchinabuy"
  };
  return map[platform] || "platform-pill-neutral";
}

function formatPlatformLabel(platform) {
  const map = {
    auto: "Auto detect",
    unknown: "Unknown",
    weidian: "Weidian",
    kakobuy: "KakoBuy",
    usfans: "UsFans",
    litbuy: "LITBUY",
    allchinabuy: "AllChinaBuy"
  };
  return map[platform] || String(platform || "Unknown");
}

function copyText(value) {
  const text = String(value || "").trim();
  if (!text || text === "Brak wyniku" || text === "Brak danych") return;
  navigator.clipboard.writeText(text).catch(() => {});
}

function openLink(value) {
  const text = String(value || "").trim();
  if (!text || !text.startsWith("http")) return;
  window.open(text, "_blank", "noopener,noreferrer");
}

function revealResultSection(section, hasShownBefore) {
  const wasHidden = section.classList.contains("hidden");
  section.classList.remove("hidden");

  if (wasHidden || !hasShownBefore) {
    section.animate(
      [
        { opacity: 0, transform: "translateY(18px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      {
        duration: 380,
        easing: "ease-out",
        fill: "both"
      }
    );
  }

  requestAnimationFrame(() => {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}