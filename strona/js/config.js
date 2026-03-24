window.APP_CONFIG = {
  SHEET_URL: "https://opensheet.elk.sh/1zvXhFPELCkv2bpfI9phWu886NMMfqITciaAdFUe_FOE/api",

  agentTargets: {
    kakobuy: {
      label: "KakoBuy",
      build: (originalUrl) =>
        `https://www.kakobuy.com/item/details?url=${encodeURIComponent(originalUrl)}`
    },
    usfans: {
      label: "UsFans",
      build: (originalUrl) =>
        `https://www.usfans.com/buy?url=${encodeURIComponent(originalUrl)}`
    },
    litbuy: {
      label: "LITBUY",
      build: (originalUrl) =>
        `https://www.litbuy.com/detail?url=${encodeURIComponent(originalUrl)}`
    },
    allchinabuy: {
      label: "AllChinaBuy",
      build: (originalUrl) =>
        `https://www.allchinabuy.com/en/page/buy/?url=${encodeURIComponent(originalUrl)}`
    },
    weidian: {
      label: "Weidian",
      build: (originalUrl) => originalUrl
    },
    taobao: {
      label: "Taobao",
      build: (originalUrl) => originalUrl
    }
  }
};