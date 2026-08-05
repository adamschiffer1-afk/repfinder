'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from '@/styles/AdminStats.module.css';

const RANGES = [
  { label: '6h',     value: '6h' },
  { label: '12h',    value: '12h' },
  { label: '24h',    value: '24h' },
  { label: '48h',    value: '48h' },
  { label: 'Tydzień',value: '7d' },
  { label: 'Miesiąc',value: '30d' },
  { label: 'Własny', value: 'custom' },
];

const TABS = [
  { id: 'overview',   label: '📊 Przegląd',    icon: '📊' },
  { id: 'sources',    label: '🎯 Źródła',      icon: '🎯' }, // Newly Added!
  { id: 'products',   label: '🔥 Produkty',     icon: '🔥' },
  { id: 'agents',     label: '📦 Agenci',       icon: '📦' },
  { id: 'pages',      label: '📄 Strony',       icon: '📄' },
  { id: 'countries',  label: '🌍 Państwa',      icon: '🌍' },
  { id: 'browsers',   label: '🌐 Przeglądarki', icon: '🌐' },
  { id: 'errors',     label: '⚠️ Błędy',        icon: '⚠️' },
  { id: 'activity',   label: '🕒 Aktywność',    icon: '🕒' },
];

const COUNTRY_NAMES = {
  PL: 'Polska',
  US: 'Stany Zjednoczone',
  DE: 'Niemcy',
  GB: 'Wielka Brytania',
  FR: 'Francja',
  NL: 'Holandia',
  CN: 'Chiny',
  IT: 'Włochy',
  ES: 'Hiszpania',
  CA: 'Kanada',
  AU: 'Australia',
  UA: 'Ukraina',
  SE: 'Szwecja',
  NO: 'Norwegia',
  FI: 'Finlandia',
  DK: 'Dania',
  CH: 'Szwajcaria',
  BE: 'Belgia',
  AT: 'Austria',
  IE: 'Irlandia'
};

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode === 'Unknown') return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch (e) {
    return '🏳️';
  }
}

function parseUA(ua) {
  if (!ua) return 'Nieznany';
  if (/iPhone/.test(ua)) return '📱 iPhone';
  if (/iPad/.test(ua)) return '📱 iPad';
  if (/Android/.test(ua)) return '📱 Android';
  if (/Windows/.test(ua)) return '🖥️ Windows';
  if (/Mac/.test(ua)) return '🖥️ Mac';
  if (/Linux/.test(ua)) return '🖥️ Linux';
  return '🌐 Inny';
}

function getBrowser(ua) {
  if (!ua) return 'Nieznana';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Inna';
}

// --- Inline SVG Chart Component ---
function LineChart({ data, height = 200 }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth);
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return <div className={styles.noData}>Brak danych dla wybranego okresu</div>;
  }

  const padding = { top: 20, right: 20, bottom: 50, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => Math.max(d.views || 0, d.clicks || 0)), 1);

  const xScale = (i) => (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v) => chartH - (v / maxVal) * chartH;

  const viewsPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.views || 0)}`).join(' ');
  const clicksPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.clicks || 0)}`).join(' ');

  const viewsArea = viewsPath + ` L${xScale(data.length - 1)},${chartH} L0,${chartH} Z`;
  const clicksArea = clicksPath + ` L${xScale(data.length - 1)},${chartH} L0,${chartH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxVal * f));
  const step = Math.max(1, Math.floor(data.length / 6));

  return (
    <div ref={containerRef} className={styles.chartContainer}>
      <div className={styles.chartLegend}>
        <span className={styles.legendViews}>● Wizyty</span>
        <span className={styles.legendClicks}>● Kliknięcia</span>
      </div>
      <svg
        width={width}
        height={height}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={0} y1={yScale(tick)}
                x2={chartW} y2={yScale(tick)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
              <text
                x={-8} y={yScale(tick) + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize={10}
              >{tick}</text>
            </g>
          ))}

          <path d={viewsArea} fill="url(#viewsGrad)" />
          <path d={clicksArea} fill="url(#clicksGrad)" />

          <path d={viewsPath} fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeLinejoin="round" />
          <path d={clicksPath} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinejoin="round" />

          {data.map((d, i) => (
            <g key={i}>
              <rect
                x={xScale(i) - 20}
                y={0}
                width={40}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setTooltip({ i, x: xScale(i), d })}
              />
              <circle cx={xScale(i)} cy={yScale(d.views || 0)} r={3} fill="#a78bfa" />
              <circle cx={xScale(i)} cy={yScale(d.clicks || 0)} r={3} fill="#34d399" />
            </g>
          ))}

          {tooltip && (() => {
            const tx = Math.min(tooltip.x, chartW - 100);
            return (
              <g>
                <line x1={tooltip.x} y1={0} x2={tooltip.x} y2={chartH} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4 2" />
                <rect x={tx} y={10} width={110} height={54} rx={6} fill="rgba(20,20,28,0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                <text x={tx + 8} y={27} fill="#a78bfa" fontSize={10} fontWeight={600}>👁 {tooltip.d.views || 0} wizyt</text>
                <text x={tx + 8} y={45} fill="#34d399" fontSize={10} fontWeight={600}>🖱 {tooltip.d.clicks || 0} kliknięć</text>
                <text x={tx + 8} y={58} fill="rgba(255,255,255,0.4)" fontSize={9}>{tooltip.d.label}</text>
              </g>
            );
          })()}

          {data.map((d, i) => (
            i % step === 0 || i === data.length - 1 ? (
              <text
                key={i}
                x={xScale(i)}
                y={chartH + 20}
                textAnchor="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize={9}
              >
                {d.label?.length > 10 ? d.label.slice(5) : d.label}
              </text>
            ) : null
          ))}
        </g>
      </svg>
    </div>
  );
}

function BarChart({ data, labelKey = '_id', valueKey = 'count', color = '#a78bfa', formatLabel = (val) => val }) {
  if (!data || data.length === 0) return <div className={styles.noData}>Brak danych</div>;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className={styles.barChart}>
      {data.map((d, i) => (
        <div key={i} className={styles.barRow}>
          <span className={styles.barLabel}>{formatLabel(d[labelKey])}</span>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${((d[valueKey] || 0) / max) * 100}%`, background: color }}
            />
          </div>
          <span className={styles.barValue}>{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

export default function StatsPage() {
  const [range, setRange] = useState('24h');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/stats?range=${range}`;
      if (range === 'custom' && customFrom && customTo) {
        url += `&from=${customFrom}&to=${customTo}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Błąd serwera');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [range, customFrom, customTo]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('pl-PL', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      day: '2-digit', month: '2-digit'
    });
  };

  return (
    <div className={styles.statsPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>📈 Statystyki</h1>
          {lastUpdated && (
            <p className={styles.lastUpdated}>Ostatnia aktualizacja: {formatTime(lastUpdated)}</p>
          )}
        </div>
        <button className={styles.refreshBtn} onClick={fetchStats} disabled={loading}>
          {loading ? <span className={styles.spinner} /> : '🔄'} Odśwież
        </button>
      </div>

      {/* Range selector */}
      <div className={styles.rangeBar}>
        <div className={styles.rangePills}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              className={`${styles.rangePill} ${range === r.value ? styles.rangePillActive : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
        {range === 'custom' && (
          <div className={styles.customRange}>
            <label>Od:</label>
            <input
              type="datetime-local"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className={styles.dateInput}
            />
            <label>Do:</label>
            <input
              type="datetime-local"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className={styles.dateInput}
            />
            <button
              className={styles.applyBtn}
              onClick={fetchStats}
              disabled={!customFrom || !customTo}
            >
              Zastosuj
            </button>
          </div>
        )}
      </div>

      {error && <div className={styles.errorMsg}>⚠️ {error}</div>}

      {/* Sub-tabs */}
      <div className={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <span>Ładowanie danych...</span>
        </div>
      ) : data ? (
        <div className={styles.tabContent}>

          {/* ===== OVERVIEW ===== */}
          {tab === 'overview' && (
            <div>
              <div className={styles.kpiGrid}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiIcon}>👁️</div>
                  <div className={styles.kpiValue}>{(data.totalVisits || 0).toLocaleString()}</div>
                  <div className={styles.kpiLabel}>Wizyty (okres)</div>
                  <div className={styles.kpiSub} style={{ color: '#a78bfa', fontWeight: 'bold' }}>Unikalni Użytkownicy: {data.uniqueVisitors || 0}</div>
                </div>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiIcon}>⏱️</div>
                  <div className={styles.kpiValue}>{Math.round(data.engagement?.avgTimeSpent || 0)}s</div>
                  <div className={styles.kpiLabel}>Średni czas na stronie</div>
                  <div className={styles.kpiSub}>Średnie przewinięcie: {Math.round(data.engagement?.avgScrollDepth || 0)}%</div>
                </div>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiIcon}>🖱️</div>
                  <div className={styles.kpiValue}>{(data.totalClicks || 0).toLocaleString()}</div>
                  <div className={styles.kpiLabel}>Kliknięcia (okres)</div>
                  <div className={styles.kpiSub}>
                    CTR: {data.totalVisits > 0 ? ((data.totalClicks / data.totalVisits) * 100).toFixed(1) + '%' : '0%'}
                  </div>
                </div>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiIcon}>🔥</div>
                  <div className={styles.kpiValue}>{data.topProducts?.[0]?.productInfo?.name?.slice(0, 16) || 'Brak'}</div>
                  <div className={styles.kpiLabel}>Najpopularniejszy produkt</div>
                  <div className={styles.kpiSub}>{data.topProducts?.[0]?.count || 0} kliknięć</div>
                </div>
              </div>

              <div className={styles.chartSection}>
                <h2 className={styles.sectionTitle}>Trend wizyt i kliknięć</h2>
                <LineChart data={data.timeline} height={260} />
              </div>

              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                  <h3>🔥 Top Produkty</h3>
                  {data.topProducts?.slice(0, 5).map((p, i) => (
                    <div key={i} className={styles.miniRow}>
                      <span className={styles.rank}>#{i + 1}</span>
                      {p.productInfo?.image && (
                        <img src={p.productInfo.image} alt="" className={styles.miniImg} />
                      )}
                      <span className={styles.miniLabel}>{p.productInfo?.name || 'Nieznany'}</span>
                      <span className={styles.miniBadge}>{p.count}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.overviewCard}>
                  <h3>📦 Top Agenci</h3>
                  {data.topAgents?.slice(0, 5).map((a, i) => (
                    <div key={i} className={styles.miniRow}>
                      <span className={styles.rank}>#{i + 1}</span>
                      <span className={styles.miniLabel} style={{ textTransform: 'capitalize' }}>{a._id || 'Auto'}</span>
                      <span className={styles.miniBadge}>{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== SOURCES ===== */}
          {tab === 'sources' && (
            <div>
              <h2 className={styles.sectionTitle}>🎯 Źródła ruchu (UTM & Referrers)</h2>
              
              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                  <h3>🔗 Kampanie UTM (utm_source)</h3>
                  <BarChart
                    data={data.topSources || []}
                    labelKey="_id"
                    valueKey="count"
                    color="linear-gradient(90deg, #ec4899, #be185d)"
                  />
                  <div className={styles.pagesList}>
                    {data.topSources?.map((s, i) => (
                      <div key={i} className={styles.pageRow}>
                        <span className={styles.pageRank}>#{i + 1}</span>
                        <span className={styles.pagePath}>{s._id || 'Brak (Bezpośrednio)'}</span>
                        <span className={styles.pageBadge} style={{ color: '#ec4899', borderColor: 'rgba(236,72,153,0.3)', background: 'rgba(236,72,153,0.1)' }}>{s.count} wizyt</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.overviewCard}>
                  <h3>🌐 Strony odsyłające (Referrer)</h3>
                  <BarChart
                    data={data.topReferrers || []}
                    labelKey="_id"
                    valueKey="count"
                    color="linear-gradient(90deg, #3b82f6, #1d4ed8)"
                  />
                  <div className={styles.pagesList}>
                    {data.topReferrers?.map((r, i) => (
                      <div key={i} className={styles.pageRow}>
                        <span className={styles.pageRank}>#{i + 1}</span>
                        <span className={styles.pagePath}>{r._id || 'Bezpośrednio / Nieznane'}</span>
                        <span className={styles.pageBadge} style={{ color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.1)' }}>{r.count} wizyt</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== PRODUCTS ===== */}
          {tab === 'products' && (
            <div>
              <h2 className={styles.sectionTitle}>🔥 Najpopularniejsze produkty</h2>
              <div className={styles.productGrid}>
                {data.topProducts?.length > 0 ? data.topProducts.map((p, i) => (
                  <div key={i} className={styles.productStatCard}>
                    <div className={styles.productRank}>#{i + 1}</div>
                    {p.productInfo?.image && (
                      <img src={p.productInfo.image} alt="" className={styles.productImg} />
                    )}
                    <div className={styles.productInfo}>
                      <div className={styles.productName}>{p.productInfo?.name || 'Nieznany produkt'}</div>
                      <div className={styles.productId}>ID: {p._id?.slice(0, 16)}...</div>
                    </div>
                    <div className={styles.productCount}>
                      <span className={styles.bigCount}>{p.count}</span>
                      <span className={styles.countLabel}>kliknięć</span>
                    </div>
                  </div>
                )) : <div className={styles.noData}>Brak danych o kliknięciach w tym okresie.</div>}
              </div>
            </div>
          )}

          {/* ===== AGENTS ===== */}
          {tab === 'agents' && (
            <div>
              <h2 className={styles.sectionTitle}>📦 Najczęściej wybierani agenci</h2>
              <div className={styles.agentGrid}>
                {data.topAgents?.length > 0 ? data.topAgents.map((a, i) => (
                  <div key={i} className={styles.agentCard}>
                    <div className={styles.agentRank}>#{i + 1}</div>
                    <div className={styles.agentName}>{a._id || 'Auto'}</div>
                    <div className={styles.agentBar}>
                      <div
                        className={styles.agentBarFill}
                        style={{
                          width: `${(a.count / (data.topAgents[0]?.count || 1)) * 100}%`
                        }}
                      />
                    </div>
                    <div className={styles.agentCount}>{a.count} razy</div>
                  </div>
                )) : <div className={styles.noData}>Brak danych o agentach.</div>}
              </div>
            </div>
          )}

          {/* ===== PAGES ===== */}
          {tab === 'pages' && (
            <div>
              <h2 className={styles.sectionTitle}>📄 Najpopularniejsze strony</h2>
              <BarChart
                data={data.topPages || []}
                labelKey="_id"
                valueKey="count"
                color="linear-gradient(90deg, #a78bfa, #7c3aed)"
              />
              <div className={styles.pagesList}>
                {data.topPages?.map((p, i) => (
                  <div key={i} className={styles.pageRow}>
                    <span className={styles.pageRank}>#{i + 1}</span>
                    <span className={styles.pagePath}>{p._id || '/'}</span>
                    <span className={styles.pageBadge}>{p.count} wizyt</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== COUNTRIES ===== */}
          {tab === 'countries' && (
            <div>
              <h2 className={styles.sectionTitle}>🌍 Podział geograficzny użytkowników</h2>
              <BarChart
                data={data.topCountries || []}
                labelKey="_id"
                valueKey="count"
                color="linear-gradient(90deg, #34d399, #10b981)"
                formatLabel={(code) => `${getFlagEmoji(code)} ${COUNTRY_NAMES[code] || code}`}
              />
              <div className={styles.pagesList} style={{ marginTop: '20px' }}>
                {data.topCountries?.map((c, i) => (
                  <div key={i} className={styles.pageRow}>
                    <span className={styles.pageRank}>#{i + 1}</span>
                    <span style={{ fontSize: '20px', marginRight: '8px' }}>{getFlagEmoji(c._id)}</span>
                    <span className={styles.pagePath} style={{ fontFamily: 'inherit', fontWeight: '600' }}>
                      {COUNTRY_NAMES[c._id] || `Kod: ${c._id}`}
                    </span>
                    <span className={styles.pageBadge} style={{ borderColor: 'rgba(52, 211, 153, 0.2)', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)' }}>
                      {c.count} zdarzeń
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== BROWSERS ===== */}
          {tab === 'browsers' && (
            <div>
              <h2 className={styles.sectionTitle}>🌐 Przeglądarki i urządzenia</h2>
              <div className={styles.browserGrid}>
                {(() => {
                  const grouped = {};
                  (data.topBrowsers || []).forEach(b => {
                    const browser = getBrowser(b._id);
                    if (!grouped[browser]) grouped[browser] = { count: 0 };
                    grouped[browser].count += b.count;
                  });
                  const sorted = Object.entries(grouped).sort(([,a],[,b]) => b.count - a.count);
                  const total = sorted.reduce((sum, [,v]) => sum + v.count, 0);
                  return sorted.map(([browser, { count }], i) => (
                    <div key={i} className={styles.browserCard}>
                      <div className={styles.browserIcon}>
                        {browser === 'Chrome' ? '🟡' : browser === 'Firefox' ? '🦊' : browser === 'Safari' ? '🧭' : browser === 'Edge' ? '🔵' : '🌐'}
                      </div>
                      <div className={styles.browserName}>{browser}</div>
                      <div className={styles.browserCount}>{count}</div>
                      <div className={styles.browserPct}>{total > 0 ? ((count/total)*100).toFixed(1) : 0}%</div>
                      <div className={styles.browserBar}>
                        <div className={styles.browserBarFill} style={{ width: `${total > 0 ? (count/total)*100 : 0}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <h2 className={styles.sectionTitle} style={{ marginTop: '30px' }}>📱 Urządzenia</h2>
              <div className={styles.browserGrid}>
                {(() => {
                  const grouped = {};
                  (data.topBrowsers || []).forEach(b => {
                    const device = /iPhone|iPad|Android/.test(b._id) ? '📱 Mobile' : '🖥️ Desktop';
                    grouped[device] = (grouped[device] || 0) + b.count;
                  });
                  const total = Object.values(grouped).reduce((s,v) => s+v, 0);
                  return Object.entries(grouped).map(([device, count], i) => (
                    <div key={i} className={styles.browserCard}>
                      <div className={styles.browserIcon}>{device.split(' ')[0]}</div>
                      <div className={styles.browserName}>{device.split(' ')[1]}</div>
                      <div className={styles.browserCount}>{count}</div>
                      <div className={styles.browserPct}>{total > 0 ? ((count/total)*100).toFixed(1) : 0}%</div>
                      <div className={styles.browserBar}>
                        <div className={styles.browserBarFill} style={{ width: `${total > 0 ? (count/total)*100 : 0}%`, background: '#34d399' }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* ===== CLIENT SIDE ERRORS ===== */}
          {tab === 'errors' && (
            <div>
              <h2 className={styles.sectionTitle}>⚠️ Ostatnio zarejestrowane błędy klientów</h2>
              <div className={styles.activityFeed}>
                {data.recentErrors?.length > 0 ? data.recentErrors.map((err, i) => {
                  const isImageLoad = err.errorMessage?.includes('obrazka') || err.errorStack?.includes('IMG');
                  return (
                    <div key={i} className={styles.activityCard} style={{ borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.02)' }}>
                      <div className={styles.activityDot} style={{ background: '#ef4444', color: '#ef4444' }} />
                      <div className={styles.activityBody}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <span 
                            style={{ 
                              background: isImageLoad ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                              color: isImageLoad ? '#f59e0b' : '#ef4444',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              textTransform: 'uppercase'
                            }}
                          >
                            {isImageLoad ? '🖼️ Dead Link' : '💥 Błąd JS'}
                          </span>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                            {getFlagEmoji(err.country)} {COUNTRY_NAMES[err.country] || err.country}
                          </span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                            {parseUA(err.userAgent)}
                          </span>
                        </div>

                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#fca5a5', marginBottom: '8px', wordBreak: 'break-all' }}>
                          {err.errorMessage}
                        </div>

                        <div className={styles.activityMeta} style={{ marginBottom: '10px' }}>
                          <span>Podstrona: <code>{err.path || '/'}</code></span>
                        </div>

                        {err.breadcrumbs && err.breadcrumbs.length > 0 && (
                          <div style={{ marginBottom: '10px', fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px' }}>
                            <div style={{ color: '#a78bfa', marginBottom: '4px', fontWeight: '600' }}>👣 Ostatnie akcje użytkownika (Breadcrumbs):</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', color: 'rgba(255,255,255,0.6)' }}>
                              {err.breadcrumbs.map((bc, idx) => (
                                <span key={idx}>
                                  <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>{bc}</code>
                                  {idx < err.breadcrumbs.length - 1 && <span style={{ margin: '0 4px' }}>→</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {err.errorStack && (
                          <details style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <summary style={{ fontSize: '12px', color: '#a78bfa', cursor: 'pointer', userSelect: 'none', fontWeight: '600' }}>
                              Rozwiń ślad stosu (Stack Trace)
                            </summary>
                            <pre style={{ marginTop: '10px', fontSize: '11px', color: '#fda4af', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.4' }}>
                              {err.errorStack}
                            </pre>
                          </details>
                        )}
                      </div>
                      <div className={styles.activityTime}>
                        {new Date(err.timestamp).toLocaleString('pl-PL', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </div>
                    </div>
                  );
                }) : <div className={styles.noData} style={{ color: '#34d399', fontStyle: 'normal' }}>🎉 Wszystko w porządku! Nie odnotowano żadnych błędów.</div>}
              </div>
            </div>
          )}

          {/* ===== ACTIVITY ===== */}
          {tab === 'activity' && (
            <div>
              <h2 className={styles.sectionTitle}>🕒 Ostatnia aktywność</h2>
              <div className={styles.activityFeed}>
                {data.recentActivity?.length > 0 ? data.recentActivity.map((act, i) => (
                  <div key={i} className={styles.activityCard}>
                    <div className={styles.activityDot} style={{ background: act.type === 'page_view' ? '#a78bfa' : '#34d399' }} />
                    <div className={styles.activityBody}>
                      <div className={styles.activityType}>
                        {act.type === 'page_view' ? '👀 Wizyta na stronie' : '🖱️ Kliknięcie produktu'}
                      </div>
                      <div className={styles.activityMeta}>
                        <span>{getFlagEmoji(act.country)} {act.path || '/'}</span>
                        <span>•</span>
                        <span>{parseUA(act.userAgent)}</span>
                        {act.agent && <><span>•</span><span className={styles.agentTag}>{act.agent}</span></>}
                      </div>
                      {act.productInfo?.name && (
                        <div className={styles.activityProduct}>📦 {act.productInfo.name}</div>
                      )}
                    </div>
                    <div className={styles.activityTime}>
                      {new Date(act.timestamp).toLocaleString('pl-PL', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </div>
                  </div>
                )) : <div className={styles.noData}>Brak aktywności w tym okresie.</div>}
              </div>
            </div>
          )}

        </div>
      ) : null}
    </div>
  );
}
