const BIN_ID = '69c32a96aa77b81da91778f6'; 
const MASTER_KEY = '$2a$10$D/K16JUBGQOBjODs5N4xg.YKaDxJSCrHReksEeS32GBaHWglrtc9u'; 
const PRODUCTS_API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;

let productsData = [];

const AGENTS = [
  { id: 'kakobuy', name: 'KakoBuy', icon: 'https://www.kakobuy.com/favicon.ico' },
  { id: 'usfans', name: 'USFans', icon: 'https://usfans.com/favicon.ico' },
  { id: 'acbuy', name: 'AllChinaBuy', icon: 'https://allchinabuy.com/favicon.ico' },
  { id: 'litbuy', name: 'LitBuy', icon: 'https://litbuy.com/favicon.ico' }
];

window.initProducts = async function () {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  
  grid.innerHTML = '<div style="text-align:center; width:100%; padding:100px; color:#555;">Loading database...</div>';
  
  try {
    const response = await fetch(PRODUCTS_API_URL, { headers: { "X-Master-Key": MASTER_KEY } });
    const resData = await response.json();
    productsData = resData.record || [];
    renderProducts(productsData);
  } catch (error) { 
    grid.innerHTML = '<div style="text-align:center; width:100%; color:#ef4444;">Database Error.</div>';
  }
};

function renderProducts(list) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  
  grid.innerHTML = list.map(p => {
    const safeName = (p.Nazwa || 'Item').replace(/'/g, "\\'");
    return `
    <article class="product-card-new">
      <img src="${p.Link_Zdjecie || 'https://placehold.co/400x400/1a1a1a/444444?text=Brak+zdjęcia'}" 
           alt="${safeName}" 
           onerror="this.src='https://placehold.co/400x400/1a1a1a/444444?text=Brak+zdjęcia'">
      
      <div class="card-tags">
        <span class="tag-blue">${p.Kategoria || 'ITEM'}</span>
        <span class="tag-red">${p.Tag || 'BEST BATCH'}</span>
      </div>

      <h3 class="card-name">${p.Nazwa}</h3>
      <div class="card-price">${p.Cena_USD}$</div>
      
      <div class="card-actions">
        <button class="btn-view-agents" onclick="openAgentsModal('${safeName}', '${p.Cena_USD}', '${p.Link_Zdjecie}', '${p.Link_Kakobuy}')">View agents</button>
        <button class="btn-icon-square" onclick="navigator.clipboard.writeText('${p.Link_Kakobuy}'); this.style.background='#15803d'; this.style.color='#fff'; setTimeout(()=>this.style.background='#262626', 1500)">📋</button>
      </div>
    </article>
  `}).join("");
}

window.openAgentsModal = (name, price, img, link) => {
    document.getElementById('am-name').innerText = name;
    document.getElementById('am-price').innerText = price + '$';
    document.getElementById('am-img').src = img && img !== 'undefined' ? img : 'https://placehold.co/400x400/1a1a1a/444444?text=No+Img';
    
    const list = document.getElementById('am-list');
    list.innerHTML = AGENTS.map(agent => {
        let finalLink = link;
        if(agent.id === 'kakobuy' && finalLink) finalLink += (finalLink.includes('?') ? '&' : '?') + 'ref_id=Repfinder';
        
        return `
            <div class="agent-list-item-dual">
                <div class="agent-info-row">
                    <a href="${finalLink}" target="_blank" class="agent-direct-btn">
                        <span class="agent-info-left">
                            <img src="${agent.icon}" onerror="this.style.display='none'">
                            ${agent.name}
                        </span>
                        <span class="agent-info-right">→</span>
                    </a>
                    <button class="agent-copy-btn" onclick="navigator.clipboard.writeText('${finalLink}'); this.style.background='#15803d'; this.style.color='#fff'; setTimeout(()=>this.style.background='#2a2a2a', 1500)">📋</button>
                </div>
            </div>`;
    }).join("");
    
    document.getElementById('agentsModal').classList.add('show');
};

window.closeAgentsModal = () => document.getElementById('agentsModal').classList.remove('show');
window.onload = initProducts;