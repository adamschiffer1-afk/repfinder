'use client';

import { useState, useEffect } from 'react';
import styles from '@/styles/NewStats.module.css';

export default function NewStatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [range, setRange] = useState('24h');
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Helper to format path names
  const formatPath = (path) => {
    if (!path || path === '/') return 'Wejście na stronę główną';
    if (path === '/products') return 'Przeglądanie produktów';
    if (path === '/calculator') return 'Kalkulator wysyłki';
    if (path === '/tracking') return 'Śledzenie przesyłki';
    if (path === '/qc') return 'Zdjęcia QC';
    if (path === '/link-converter') return 'Konwerter linków';
    if (path === '/promotions') return 'Promocje';
    if (path.startsWith('/products/')) return 'Szczegóły produktu';
    if (path.startsWith('/profile/')) return 'Profil użytkownika';
    return `Wizyta na: ${path}`;
  };

  useEffect(() => {
    fetchStats();
  }, [range, customMode]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/stats?range=${range}`;
      if (customMode && customFrom && customTo) {
        url = `/api/admin/stats?from=${customFrom}&to=${customTo}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Błąd pobierania danych');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      fetchStats();
    }
  };

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    setCustomMode(false);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Ładowanie statystyk...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>Błąd</h2>
          <p>{error}</p>
          <button onClick={fetchStats} className={styles.retryBtn}>
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>📊 Statystyki</h1>
          <p className={styles.subtitle}>Analityka ruchu i produktów</p>
        </div>
        <button onClick={fetchStats} className={styles.refreshBtn}>
          🔄 Odśwież
        </button>
      </div>

      {/* Time Range Selector */}
      <div className={styles.rangeSelector}>
        <div className={styles.rangeButtons}>
          {['1h', '6h', '12h', '24h', '48h', '7d', '30d'].map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              className={`${styles.rangeBtn} ${range === r && !customMode ? styles.active : ''}`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={() => setCustomMode(true)}
            className={`${styles.rangeBtn} ${styles.customBtn} ${customMode ? styles.active : ''}`}
          >
            📅 Własny zakres
          </button>
        </div>
        
        {customMode && (
          <div className={styles.customRange}>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={styles.dateInput}
              placeholder="Od"
            />
            <span className={styles.dateSeparator}>→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className={styles.dateInput}
              placeholder="Do"
            />
            <button onClick={handleCustomApply} className={styles.applyBtn}>
              Zastosuj
            </button>
          </div>
        )}
      </div>

      {/* Timeline Chart */}
      {stats?.timeline && stats.timeline.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📈 Wykres aktywności w czasie</h2>
          <div className={styles.chartContainer}>
            <div className={styles.chart}>
              {stats.timeline.map((point, idx) => {
                const maxValue = Math.max(...stats.timeline.map(p => p.page_view + p.product_click));
                const heightPercent = ((point.page_view + point.product_click) / maxValue) * 100;
                
                return (
                  <div key={idx} className={styles.chartBar} title={`${point.time}: ${point.page_view + point.product_click} eventów`}>
                    <div 
                      className={styles.barFill} 
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div 
                        className={styles.barSegmentViews} 
                        style={{ 
                          height: maxValue > 0 ? `${(point.page_view / (point.page_view + point.product_click)) * 100}%` : '0%' 
                        }}
                      />
                      <div 
                        className={styles.barSegmentClicks} 
                        style={{ 
                          height: maxValue > 0 ? `${(point.product_click / (point.page_view + point.product_click)) * 100}%` : '0%' 
                        }}
                      />
                    </div>
                    <div className={styles.chartLabel}>
                      {point.time.split(' ')[1] || point.time.split('-').slice(1).join('/')}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={styles.chartLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendColorViews}></span> Wyświetlenia
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendColorClicks}></span> Kliknięcia
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>👁️</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{stats?.totalVisits?.toLocaleString() || 0}</div>
            <div className={styles.kpiLabel}>Wyświetlenia</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>👥</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{stats?.uniqueVisitors?.toLocaleString() || 0}</div>
            <div className={styles.kpiLabel}>Unikalni użytkownicy</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>🖱️</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>{stats?.totalClicks?.toLocaleString() || 0}</div>
            <div className={styles.kpiLabel}>Kliknięcia produktów</div>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon}>⏱️</div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue}>
              {Math.round(stats?.engagement?.avgTimeSpent || 0)}s
            </div>
            <div className={styles.kpiLabel}>Średni czas na stronie</div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🔥 Najpopularniejsze produkty</h2>
        <div className={styles.productGrid}>
          {stats?.topProducts?.slice(0, 8).map((product, index) => (
            <div key={index} className={styles.productCard}>
              <div className={styles.productRank}>#{index + 1}</div>
              {product.productInfo?.image && (
                <img
                  src={product.productInfo.image}
                  alt={product.productInfo.name}
                  className={styles.productImage}
                />
              )}
              <div className={styles.productInfo}>
                <div className={styles.productName}>
                  {product.productInfo?.name || 'Nieznany produkt'}
                </div>
                <div className={styles.productStats}>
                  {product.count} kliknięć
                </div>
              </div>
            </div>
          )) || (
            <div className={styles.noData}>Brak danych o produktach</div>
          )}
        </div>
      </div>

      {/* Top Agents & Countries */}
      <div className={styles.twoColumns}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📦 Najpopularniejsze agencje</h2>
          <div className={styles.listItems}>
            {stats?.topAgents?.slice(0, 5).map((agent, index) => (
              <div key={index} className={styles.listItem}>
                <span className={styles.listRank}>#{index + 1}</span>
                <span className={styles.listLabel}>{agent._id || 'Nieznany'}</span>
                <span className={styles.listValue}>{agent.count}</span>
              </div>
            )) || <div className={styles.noData}>Brak danych</div>}
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🌍 Top kraje - wszystkie wizyty</h2>
          <div className={styles.listItems}>
            {stats?.topCountries?.slice(0, 5).map((country, index) => (
              <div key={index} className={styles.listItem}>
                <span className={styles.listRank}>#{index + 1}</span>
                <span className={styles.listLabel}>{country._id || 'Unknown'}</span>
                <span className={styles.listValue}>{country.count}</span>
              </div>
            )) || <div className={styles.noData}>Brak danych</div>}
          </div>
        </div>
      </div>

      {/* Top Countries for Product Clicks */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🌍 Top kraje - kliknięcia w produkty</h2>
        <div className={styles.listItems}>
          {stats?.topCountriesClicks?.slice(0, 5).map((country, index) => (
            <div key={index} className={styles.listItem}>
              <span className={styles.listRank}>#{index + 1}</span>
              <span className={styles.listLabel}>{country._id || 'Unknown'}</span>
              <span className={styles.listValue}>{country.count}</span>
            </div>
          )) || <div className={styles.noData}>Brak danych</div>}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🕒 Ostatnia aktywność</h2>
        <div className={styles.activityList}>
          {stats?.recentActivity?.slice(0, 10).map((activity, index) => (
            <div key={index} className={styles.activityItem}>
              <div className={styles.activityIcon}>
                {activity.type === 'product_click' ? '🖱️' : '👁️'}
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityText}>
                  {activity.type === 'product_click'
                    ? `Kliknięcie produktu: ${activity.productName || activity.product_name || 'Nieznany produkt'}`
                    : formatPath(activity.path)}
                </div>
                <div className={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleString('pl-PL')}
                </div>
              </div>
            </div>
          )) || <div className={styles.noData}>Brak ostatniej aktywności</div>}
        </div>
      </div>
    </div>
  );
}
