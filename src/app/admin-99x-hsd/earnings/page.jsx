'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '@/styles/Admin.module.css';
import e from '@/styles/AdminEarnings.module.css';

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function BarChart({ entries, field, color, labelFn }) {
  if (!entries || entries.length === 0) return null;
  const vals = entries.map(en => en[field] || 0);
  const max = Math.max(...vals, 1);
  return (
    <div className={e.barChart}>
      {entries.map((en, i) => (
        <div key={i} className={e.barCol} title={`${fmtDate(en.date)}: ${labelFn ? labelFn(en[field]) : fmt(en[field])}`}>
          <div className={e.bar} style={{ height: `${(vals[i] / max) * 100}%`, background: color }} />
          <span className={e.barLabel}>{fmtDate(en.date).slice(0, 5)}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ icon, value, label, sub, color = '#a78bfa', accent }) {
  return (
    <div className={e.kpiCard} style={{ '--accent': accent || color }}>
      <div className={e.kpiIcon}>{icon}</div>
      <div className={e.kpiValue} style={{ color }}>{value}</div>
      <div className={e.kpiLabel}>{label}</div>
      {sub && <div className={e.kpiSub}>{sub}</div>}
    </div>
  );
}

export default function EarningsPage() {
  const [entries, setEntries]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editEntry, setEditEntry]       = useState(null);
  const [toasts, setToasts]             = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const [rates, setRates]               = useState({ CNY_TO_PLN: null, CNY_TO_USD: null });
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesFallback, setRatesFallback] = useState(false);
  const [convCNY, setConvCNY]           = useState('');
  const emptyForm = { date: '', saleCNY: '', commissionRate: 30, note: '' };
  const [form, setForm]                 = useState(emptyForm);

  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).slice(2, 8);
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const askConfirm = useCallback((title, message, onConfirm) => {
    setConfirmModal({ open: true, title, message, onConfirm: () => { onConfirm(); setConfirmModal({ open: false }); } });
  }, []);

  const fetchRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      const res = await fetch('/api/earnings/rates');
      const data = await res.json();
      setRates(data.rates);
      setRatesFallback(!!data.fallback);
    } catch {
      setRatesFallback(true);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(); }, [fetchRates]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/earnings');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      showToast('Błąd pobierania danych.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const method = editEntry ? 'PUT' : 'POST';
    const url    = editEntry ? `/api/earnings/${editEntry._id}` : '/api/earnings';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          saleCNY: Number(form.saleCNY) || 0,
          commissionRate: Number(form.commissionRate) || 30,
          note: form.note,
        }),
      });
      if (!res.ok) throw new Error();
      showToast(editEntry ? 'Zaktualizowano!' : 'Dodano wpis!');
      fetchEntries();
      closeModal();
    } catch {
      showToast('Błąd zapisu.', 'error');
    }
  };

  const handleDelete = useCallback((id) => {
    askConfirm('Usuń wpis', 'Na pewno usunąć ten wpis?', async () => {
      try {
        const res = await fetch(`/api/earnings/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Usunięto.');
        fetchEntries();
      } catch {
        showToast('Błąd usuwania.', 'error');
      }
    });
  }, [askConfirm, showToast, fetchEntries]);

  const openEdit = useCallback((entry) => {
    setEditEntry(entry);
    setForm({
      date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : '',
      saleCNY: entry.saleCNY ?? '',
      commissionRate: entry.commissionRate ?? 30,
      note: entry.note ?? '',
    });
    setShowModal(true);
  }, []);

  const closeModal = () => { setShowModal(false); setEditEntry(null); setForm(emptyForm); };

  const sorted   = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const enriched = sorted.map(en => {
    const commCNY = (en.saleCNY || 0) * ((en.commissionRate ?? 30) / 100);
    const commPLN = rates.CNY_TO_PLN != null ? commCNY * rates.CNY_TO_PLN : null;
    const commUSD = rates.CNY_TO_USD != null ? commCNY * rates.CNY_TO_USD : null;
    return { ...en, commCNY, commPLN, commUSD };
  });

  const totalSaleCNY = enriched.reduce((s, en) => s + (en.saleCNY || 0), 0);
  const totalCommCNY = enriched.reduce((s, en) => s + (en.commCNY || 0), 0);
  const totalCommPLN = rates.CNY_TO_PLN != null ? totalCommCNY * rates.CNY_TO_PLN : null;
  const totalCommUSD = rates.CNY_TO_USD != null ? totalCommCNY * rates.CNY_TO_USD : null;
  const avgCommRate  = enriched.length ? (enriched.reduce((s, en) => s + (en.commissionRate ?? 30), 0) / enriched.length).toFixed(1) : 30;

  const convNum = parseFloat(convCNY) || 0;
  const convPLN = rates.CNY_TO_PLN != null ? convNum * rates.CNY_TO_PLN : null;
  const convUSD = rates.CNY_TO_USD != null ? convNum * rates.CNY_TO_USD : null;

  return (
    <div className={styles.adminContainer}>

      {/* ── Header ── */}
      <header className={styles.adminHeader}>
        <div>
          <h1>💰 Zarobki — Kalkulator i Analizy</h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: 4, fontSize: 14 }}>
            Wpisz sprzedaż w CNY — automatycznie przeliczamy Twoją prowizję
          </p>
        </div>
        <button className={styles.scraperBtn} onClick={() => { setEditEntry(null); setForm(emptyForm); setShowModal(true); }}>
          + Dodaj wpis
        </button>
      </header>

      {/* ── KPI strip ── */}
      <div className={e.kpiGrid}>
        <KpiCard icon="🏪" value={`¥${fmt(totalSaleCNY)}`} label="Łączna sprzedaż (CNY)" color="#f59e0b" accent="#f59e0b" />
        <KpiCard icon="💴" value={`¥${fmt(totalCommCNY)}`} label="Twoja prowizja (CNY)" sub={`${avgCommRate}% śr. prowizja`} color="#a78bfa" accent="#a78bfa" />
        <KpiCard icon="🇵🇱" value={totalCommPLN != null ? `${fmt(totalCommPLN)} zł` : '—'}
          label="Prowizja (PLN)" sub={rates.CNY_TO_PLN ? `1 CNY = ${rates.CNY_TO_PLN.toFixed(4)} PLN` : null} color="#34d399" accent="#34d399" />
        <KpiCard icon="🇺🇸" value={totalCommUSD != null ? `$${fmt(totalCommUSD)}` : '—'}
          label="Prowizja (USD)" sub={rates.CNY_TO_USD ? `1 CNY = ${rates.CNY_TO_USD.toFixed(4)} USD` : null} color="#60a5fa" accent="#60a5fa" />
        <KpiCard icon="📝" value={entries.length} label="Liczba wpisów" color="rgba(255,255,255,0.7)" />
      </div>

      {/* ── Live converter ── */}
      <div className={e.converterCard}>
        <h3>🔄 Przelicznik CNY na żywo</h3>
        <div className={e.converterRow}>
          <input className={e.converterInput} type="number" min="0" step="0.01" placeholder="0.00"
            value={convCNY} onChange={ev => setConvCNY(ev.target.value)} style={{ maxWidth: 180 }} />
          <span className={e.converterArrow}>→</span>
          <div className={e.converterResults}>
            <div className={e.converterResult}>
              <div className={e.converterResultLabel}>PLN 🇵🇱</div>
              <div className={e.converterResultValue} style={{ color: '#34d399' }}>
                {convPLN != null ? `${fmt(convPLN)} zł` : '—'}
              </div>
            </div>
            <div className={e.converterResult}>
              <div className={e.converterResultLabel}>USD 🇺🇸</div>
              <div className={e.converterResultValue} style={{ color: '#60a5fa' }}>
                {convUSD != null ? `$${fmt(convUSD)}` : '—'}
              </div>
            </div>
          </div>
        </div>
        <div className={e.rateInfo}>
          {rates.CNY_TO_PLN && <span className={e.rateTag}>1 CNY = {rates.CNY_TO_PLN.toFixed(4)} PLN</span>}
          {rates.CNY_TO_USD && <span className={e.rateTag}>1 CNY = {rates.CNY_TO_USD.toFixed(4)} USD</span>}
          {ratesFallback && <span className={e.rateTag} style={{ color: '#fbbf24' }}>⚠️ Kursy przybliżone</span>}
          <button className={e.rateRefresh} onClick={fetchRates} disabled={ratesLoading}>
            {ratesLoading ? '⟳' : '🔄 Odśwież kursy'}
          </button>
        </div>
      </div>

      {/* ── Bar charts ── */}
      {enriched.length > 1 && (
        <div className={e.chartsRow}>
          <div className={e.chartCard}>
            <h3>🏪 Sprzedaż CNY w czasie</h3>
            <BarChart entries={enriched} field="saleCNY" color="linear-gradient(180deg,#f59e0b,#d97706)" labelFn={v => `¥${fmt(v)}`} />
          </div>
          <div className={e.chartCard}>
            <h3>💴 Prowizja CNY w czasie</h3>
            <BarChart entries={enriched} field="commCNY" color="linear-gradient(180deg,#a78bfa,#7c3aed)" labelFn={v => `¥${fmt(v)}`} />
          </div>
          {totalCommPLN != null && (
            <div className={e.chartCard}>
              <h3>🇵🇱 Prowizja PLN w czasie</h3>
              <BarChart entries={enriched} field="commPLN" color="linear-gradient(180deg,#34d399,#059669)" labelFn={v => `${fmt(v)} zł`} />
            </div>
          )}
        </div>
      )}

      {/* ── Summary cards ── */}
      {enriched.length > 0 && (
        <div className={e.summaryRow}>
          <div className={e.summaryCard}>
            <h4>📊 Podsumowanie łączne</h4>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Sprzedaż (CNY)</span>
              <span className={e.summaryLineVal} style={{ color: '#f59e0b' }}>¥{fmt(totalSaleCNY)}</span>
            </div>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Prowizja (CNY)</span>
              <span className={e.summaryLineVal} style={{ color: '#a78bfa' }}>¥{fmt(totalCommCNY)}</span>
            </div>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Prowizja (PLN)</span>
              <span className={e.summaryLineVal} style={{ color: '#34d399' }}>{totalCommPLN != null ? `${fmt(totalCommPLN)} zł` : '—'}</span>
            </div>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Prowizja (USD)</span>
              <span className={e.summaryLineVal} style={{ color: '#60a5fa' }}>{totalCommUSD != null ? `$${fmt(totalCommUSD)}` : '—'}</span>
            </div>
          </div>
          <div className={e.summaryCard}>
            <h4>📅 Ostatni wpis</h4>
            {(() => {
              const latest = enriched[enriched.length - 1];
              if (!latest) return null;
              return (<>
                <div className={e.summaryLine}><span className={e.summaryLineKey}>Data</span><span className={e.summaryLineVal}>{fmtDate(latest.date)}</span></div>
                <div className={e.summaryLine}><span className={e.summaryLineKey}>Sprzedaż</span><span className={e.summaryLineVal} style={{ color: '#f59e0b' }}>¥{fmt(latest.saleCNY)}</span></div>
                <div className={e.summaryLine}><span className={e.summaryLineKey}>Prowizja %</span><span className={e.summaryLineVal} style={{ color: '#a78bfa' }}>{latest.commissionRate}%</span></div>
                <div className={e.summaryLine}><span className={e.summaryLineKey}>Prowizja PLN</span><span className={e.summaryLineVal} style={{ color: '#34d399' }}>{latest.commPLN != null ? `${fmt(latest.commPLN)} zł` : '—'}</span></div>
              </>);
            })()}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className={e.tableSection}>
        <h2 style={{ marginBottom: 16, fontSize: 18, color: 'rgba(255,255,255,0.8)' }}>📅 Historia wpisów</h2>
        {loading ? (
          <div className={styles.spinnerContainer}><div className={styles.loadingSpinner} /><p style={{ marginTop: 10 }}>Ładowanie...</p></div>
        ) : entries.length === 0 ? (
          <div className={styles.noProductsPlaceholder}>📭 Brak wpisów. Dodaj pierwszy klikając przycisk powyżej.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Data</th><th>Sprzedaż (CNY)</th><th>Prowizja %</th>
                  <th>Prowizja CNY</th><th>Prowizja PLN</th><th>Prowizja USD</th>
                  <th>Notatka</th><th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {[...enriched].reverse().map((en) => (
                  <tr key={en._id}>
                    <td style={{ fontWeight: 700, color: '#a78bfa' }}>{fmtDate(en.date)}</td>
                    <td><span className={e.numBadge} style={{ '--c': '#f59e0b' }}>¥{fmt(en.saleCNY)}</span></td>
                    <td style={{ color: '#a78bfa', fontWeight: 700 }}>{en.commissionRate}%</td>
                    <td><span className={e.numBadge} style={{ '--c': '#a78bfa' }}>¥{fmt(en.commCNY)}</span></td>
                    <td><span className={e.numBadge} style={{ '--c': '#34d399' }}>{en.commPLN != null ? `${fmt(en.commPLN)} zł` : '—'}</span></td>
                    <td><span className={e.numBadge} style={{ '--c': '#60a5fa' }}>{en.commUSD != null ? `$${fmt(en.commUSD)}` : '—'}</span></td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{en.note || '—'}</td>
                    <td className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => openEdit(en)}>Edytuj</button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(en._id)}>Usuń</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.adminModal} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{editEntry ? '✏️ Edytuj wpis' : '➕ Nowy wpis'}</h2>
              <span style={{ fontSize: 24, cursor: 'pointer', opacity: 0.4 }} onClick={closeModal}>&times;</span>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className={e.formLabel}>📅 Data</label>
                <input type="date" value={form.date} required onChange={ev => setForm({ ...form, date: ev.target.value })}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 12, borderRadius: 8, color: '#fff', colorScheme: 'dark' }} />
              </div>
              <div>
                <label className={e.formLabel}>🏪 Sprzedaż od sprzedawcy (CNY ¥)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.saleCNY} required
                  onChange={ev => setForm({ ...form, saleCNY: ev.target.value })}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 12, borderRadius: 8, color: '#fff' }} />
                {form.saleCNY > 0 && (
                  <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.45)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>Twoja prowizja ({form.commissionRate}%): <strong style={{ color: '#a78bfa' }}>¥{fmt((form.saleCNY * form.commissionRate) / 100)}</strong></span>
                    {rates.CNY_TO_PLN && <span>= <strong style={{ color: '#34d399' }}>{fmt((form.saleCNY * form.commissionRate / 100) * rates.CNY_TO_PLN)} zł</strong></span>}
                    {rates.CNY_TO_USD && <span>= <strong style={{ color: '#60a5fa' }}>${fmt((form.saleCNY * form.commissionRate / 100) * rates.CNY_TO_USD)}</strong></span>}
                  </div>
                )}
              </div>
              <div>
                <label className={e.formLabel}>💹 Twoja prowizja (%)</label>
                <div className={e.sliderWrap}>
                  <input type="range" min="1" max="100" value={form.commissionRate}
                    onChange={ev => setForm({ ...form, commissionRate: Number(ev.target.value) })} className={e.slider} />
                  <span className={e.sliderValue}>{form.commissionRate}%</span>
                </div>
              </div>
              <div>
                <label className={e.formLabel}>📝 Notatka</label>
                <textarea placeholder="Opcjonalna notatka..." value={form.note}
                  onChange={ev => setForm({ ...form, note: ev.target.value })} rows={2}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 12, borderRadius: 8, color: '#fff', resize: 'vertical', font: 'inherit' }} />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" style={{ background: '#a78bfa', color: '#000', padding: 12, borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', flex: 1 }}>
                  {editEntry ? 'Zapisz zmiany' : 'Dodaj wpis'}
                </button>
                <button type="button" onClick={closeModal} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: 12, borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer', flex: 1 }}>
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm modal ── */}
      {confirmModal.open && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.adminModal} ${styles.confirmModal}`}>
            <h2>{confirmModal.title}</h2>
            <p>{confirmModal.message}</p>
            <div className={styles.modalActions}>
              <button onClick={confirmModal.onConfirm} className={styles.confirmModalBtn}>Tak, usuń</button>
              <button type="button" onClick={() => setConfirmModal({ open: false })} className={styles.cancelModalBtn}>Anuluj</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ── */}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
            <span className={styles.toastIcon}>{toast.type === 'success' ? '⚡' : '⚠️'}</span>
            <span className={styles.toastMessage}>{toast.msg}</span>
            <button className={styles.toastClose} onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))}>&times;</button>
          </div>
        ))}
      </div>

    </div>
  );
}
