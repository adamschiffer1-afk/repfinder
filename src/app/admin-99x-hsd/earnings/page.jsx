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

function KpiCard({ value, label, sub, color = '#a78bfa' }) {
  return (
    <div className={e.kpiCard}>
      <div className={e.kpiLabel}>
        <span className={e.kpiDot} style={{ background: color }} />
        {label}
      </div>
      <div className={e.kpiValue}>{value}</div>
      {sub && <div className={e.kpiSub}>{sub}</div>}
    </div>
  );
}

export default function EarningsPage() {
  const [entries, setEntries]           = useState([]);
  const [returns, setReturns]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [editEntry, setEditEntry]       = useState(null);
  const [editReturn, setEditReturn]     = useState(null);
  const [toasts, setToasts]             = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const [rates, setRates]               = useState({ CNY_TO_PLN: null, CNY_TO_USD: null });
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesFallback, setRatesFallback] = useState(false);
  const [convCNY, setConvCNY]           = useState('');
  const emptyForm = { date: '', saleCNY: '', commissionRate: 30, note: '' };
  const emptyReturnForm = { date: '', returnAmountCNY: '', productRef: '', reason: '' };
  const [form, setForm]                 = useState(emptyForm);
  const [returnForm, setReturnForm]     = useState(emptyReturnForm);

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

  const fetchReturns = useCallback(async () => {
    try {
      const res = await fetch('/api/earnings/returns');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReturns(data.returns || []);
    } catch {
      showToast('Błąd pobierania zwrotów.', 'error');
    }
  }, [showToast]);

  useEffect(() => { fetchEntries(); fetchReturns(); }, [fetchEntries, fetchReturns]);

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
  const closeReturnModal = () => { setShowReturnModal(false); setEditReturn(null); setReturnForm(emptyReturnForm); };

  const handleReturnSubmit = async (ev) => {
    ev.preventDefault();
    const method = editReturn ? 'PUT' : 'POST';
    const url    = editReturn ? `/api/earnings/returns/${editReturn._id}` : '/api/earnings/returns';
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: returnForm.date,
          returnAmountCNY: Number(returnForm.returnAmountCNY) || 0,
          productRef: returnForm.productRef,
          reason: returnForm.reason,
        }),
      });
      if (!res.ok) throw new Error();
      showToast(editReturn ? 'Zaktualizowano zwrot!' : 'Dodano zwrot!');
      fetchReturns();
      closeReturnModal();
    } catch {
      showToast('Błąd zapisu zwrotu.', 'error');
    }
  };

  const handleDeleteReturn = useCallback((id) => {
    askConfirm('Usuń zwrot', 'Na pewno usunąć ten zwrot?', async () => {
      try {
        const res = await fetch(`/api/earnings/returns/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Usunięto zwrot.');
        fetchReturns();
      } catch {
        showToast('Błąd usuwania zwrotu.', 'error');
      }
    });
  }, [askConfirm, showToast, fetchReturns]);

  const openEditReturn = useCallback((returnEntry) => {
    setEditReturn(returnEntry);
    setReturnForm({
      date: returnEntry.date ? new Date(returnEntry.date).toISOString().split('T')[0] : '',
      returnAmountCNY: returnEntry.returnAmountCNY ?? '',
      productRef: returnEntry.productRef ?? '',
      reason: returnEntry.reason ?? '',
    });
    setShowReturnModal(true);
  }, []);

  const sorted   = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const enriched = sorted.map(en => {
    const commCNY = (en.saleCNY || 0) * ((en.commissionRate ?? 30) / 100);
    const commPLN = rates.CNY_TO_PLN != null ? commCNY * rates.CNY_TO_PLN : null;
    const commUSD = rates.CNY_TO_USD != null ? commCNY * rates.CNY_TO_USD : null;
    return { ...en, commCNY, commPLN, commUSD };
  });

  const totalSaleCNY = enriched.reduce((s, en) => s + (en.saleCNY || 0), 0);
  const totalReturnsCNY = returns.reduce((s, ret) => s + (ret.returnAmountCNY || 0), 0);
  const netSaleCNY = totalSaleCNY - totalReturnsCNY;
  const totalCommCNY = enriched.reduce((s, en) => s + (en.commCNY || 0), 0);
  const netCommCNY = (netSaleCNY * (enriched.length > 0 ? (enriched.reduce((s, en) => s + (en.commissionRate ?? 30), 0) / enriched.length) : 30)) / 100;
  const totalCommPLN = rates.CNY_TO_PLN != null ? totalCommCNY * rates.CNY_TO_PLN : null;
  const totalCommUSD = rates.CNY_TO_USD != null ? totalCommCNY * rates.CNY_TO_USD : null;
  const netCommPLN = rates.CNY_TO_PLN != null ? netCommCNY * rates.CNY_TO_PLN : null;
  const netCommUSD = rates.CNY_TO_USD != null ? netCommCNY * rates.CNY_TO_USD : null;
  const avgCommRate  = enriched.length ? (enriched.reduce((s, en) => s + (en.commissionRate ?? 30), 0) / enriched.length).toFixed(1) : 30;

  const convNum = parseFloat(convCNY) || 0;
  const convPLN = rates.CNY_TO_PLN != null ? convNum * rates.CNY_TO_PLN : null;
  const convUSD = rates.CNY_TO_USD != null ? convNum * rates.CNY_TO_USD : null;

  return (
    <div className={styles.adminContainer}>

      {/* ── Header ── */}
      <header className={styles.adminHeader}>
        <div>
          <h1>Zarobki</h1>
          <p className={styles.headerSubtitle}>
            Wpisz sprzedaż w CNY — prowizja przeliczy się automatycznie
          </p>
        </div>
        <button className={styles.scraperBtn} onClick={() => { setEditEntry(null); setForm(emptyForm); setShowModal(true); }}>
          + Dodaj wpis
        </button>
      </header>

      {/* ── KPI strip ── */}
      <div className={e.kpiGrid}>
        <KpiCard value={`¥${fmt(totalSaleCNY)}`} label="Sprzedaż brutto (CNY)" color="#f59e0b" />
        <KpiCard value={`¥${fmt(totalReturnsCNY)}`} label="Zwroty (CNY)" sub={`${returns.length} zwrotów`} color="#ef4444" />
        <KpiCard value={`¥${fmt(netSaleCNY)}`} label="Sprzedaż netto (CNY)" sub="Po odliczeniu zwrotów" color="#10b981" />
        <KpiCard value={`¥${fmt(netCommCNY)}`} label="Prowizja netto (CNY)" sub={`${avgCommRate}% śr. prowizja`} color="#a78bfa" />
        <KpiCard value={netCommPLN != null ? `${fmt(netCommPLN)} zł` : '—'}
          label="Prowizja netto (PLN)" sub={rates.CNY_TO_PLN ? `1 CNY = ${rates.CNY_TO_PLN.toFixed(4)} PLN` : null} color="#34d399" />
        <KpiCard value={netCommUSD != null ? `$${fmt(netCommUSD)}` : '—'}
          label="Prowizja netto (USD)" sub={rates.CNY_TO_USD ? `1 CNY = ${rates.CNY_TO_USD.toFixed(4)} USD` : null} color="#60a5fa" />
      </div>

      {/* ── Live converter ── */}
      <div className={e.converterCard}>
        <h3>Przelicznik CNY</h3>
        <div className={e.converterRow}>
          <div className={e.converterInputWrap}>
            <span className={e.converterPrefix}>¥</span>
            <input className={e.converterInput} type="number" min="0" step="0.01" placeholder="0.00"
              value={convCNY} onChange={ev => setConvCNY(ev.target.value)} aria-label="Kwota w CNY" />
          </div>
          <span className={e.converterArrow}>→</span>
          <div className={e.converterResults}>
            <div className={e.converterResult}>
              <div className={e.converterResultLabel}>PLN</div>
              <div className={e.converterResultValue}>
                {convPLN != null ? `${fmt(convPLN)} zł` : '—'}
              </div>
            </div>
            <div className={e.converterResult}>
              <div className={e.converterResultLabel}>USD</div>
              <div className={e.converterResultValue}>
                {convUSD != null ? `$${fmt(convUSD)}` : '—'}
              </div>
            </div>
          </div>
        </div>
        <div className={e.rateInfo}>
          {rates.CNY_TO_PLN && <span className={e.rateTag}>1 CNY = {rates.CNY_TO_PLN.toFixed(4)} PLN</span>}
          {rates.CNY_TO_USD && <span className={e.rateTag}>1 CNY = {rates.CNY_TO_USD.toFixed(4)} USD</span>}
          {ratesFallback && <span className={`${e.rateTag} ${e.rateTagWarn}`}>Kursy przybliżone</span>}
          <button className={e.rateRefresh} onClick={fetchRates} disabled={ratesLoading}>
            {ratesLoading ? 'Odświeżanie…' : 'Odśwież kursy'}
          </button>
        </div>
      </div>

      {/* ── Bar charts ── */}
      {enriched.length > 1 && (
        <div className={e.chartsRow}>
          <div className={e.chartCard}>
            <h3>Sprzedaż (CNY) w czasie</h3>
            <BarChart entries={enriched} field="saleCNY" color="#71717a" labelFn={v => `¥${fmt(v)}`} />
          </div>
          <div className={e.chartCard}>
            <h3>Prowizja (CNY) w czasie</h3>
            <BarChart entries={enriched} field="commCNY" color="#a78bfa" labelFn={v => `¥${fmt(v)}`} />
          </div>
          {totalCommPLN != null && (
            <div className={e.chartCard}>
              <h3>Prowizja (PLN) w czasie</h3>
              <BarChart entries={enriched} field="commPLN" color="#34d399" labelFn={v => `${fmt(v)} zł`} />
            </div>
          )}
        </div>
      )}

      {/* ── Summary cards ── */}
      {enriched.length > 0 && (
        <div className={e.summaryRow}>
          <div className={e.summaryCard}>
            <h4>Podsumowanie łączne</h4>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Sprzedaż brutto (CNY)</span>
              <span className={e.summaryLineVal}>¥{fmt(totalSaleCNY)}</span>
            </div>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Zwroty (CNY)</span>
              <span className={`${e.summaryLineVal} ${e.negative}`}>-¥{fmt(totalReturnsCNY)}</span>
            </div>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Sprzedaż netto (CNY)</span>
              <span className={e.summaryLineVal}>¥{fmt(netSaleCNY)}</span>
            </div>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Prowizja netto (CNY)</span>
              <span className={e.summaryLineVal}>¥{fmt(netCommCNY)}</span>
            </div>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Prowizja netto (PLN)</span>
              <span className={e.summaryLineVal}>{netCommPLN != null ? `${fmt(netCommPLN)} zł` : '—'}</span>
            </div>
            <div className={e.summaryLine}>
              <span className={e.summaryLineKey}>Prowizja netto (USD)</span>
              <span className={e.summaryLineVal}>{netCommUSD != null ? `$${fmt(netCommUSD)}` : '—'}</span>
            </div>
          </div>
          <div className={e.summaryCard}>
            <h4>Ostatni wpis</h4>
            {(() => {
              const latest = enriched[enriched.length - 1];
              if (!latest) return null;
              return (<>
                <div className={e.summaryLine}><span className={e.summaryLineKey}>Data</span><span className={e.summaryLineVal}>{fmtDate(latest.date)}</span></div>
                <div className={e.summaryLine}><span className={e.summaryLineKey}>Sprzedaż</span><span className={e.summaryLineVal}>¥{fmt(latest.saleCNY)}</span></div>
                <div className={e.summaryLine}><span className={e.summaryLineKey}>Prowizja %</span><span className={e.summaryLineVal}>{latest.commissionRate}%</span></div>
                <div className={e.summaryLine}><span className={e.summaryLineKey}>Prowizja PLN</span><span className={e.summaryLineVal}>{latest.commPLN != null ? `${fmt(latest.commPLN)} zł` : '—'}</span></div>
              </>);
            })()}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className={e.tableSection}>
        <div className={styles.sectionBar}>
          <h2 className={styles.sectionHeading}>Historia wpisów</h2>
        </div>
        {loading ? (
          <div className={styles.spinnerContainer}><div className={styles.loadingSpinner} /><p>Ładowanie...</p></div>
        ) : entries.length === 0 ? (
          <div className={styles.noProductsPlaceholder}>
            <span className={styles.emptyTitle}>Brak wpisów</span>
            <span className={styles.emptyHint}>Dodaj pierwszy wpis przyciskiem „Dodaj wpis”.</span>
          </div>
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
                    <td className={styles.cellStrong}>{fmtDate(en.date)}</td>
                    <td><span className={e.numBadge}>¥{fmt(en.saleCNY)}</span></td>
                    <td className={styles.numCell}>{en.commissionRate}%</td>
                    <td><span className={e.numBadge}>¥{fmt(en.commCNY)}</span></td>
                    <td><span className={e.numBadge}>{en.commPLN != null ? `${fmt(en.commPLN)} zł` : '—'}</span></td>
                    <td><span className={e.numBadge}>{en.commUSD != null ? `$${fmt(en.commUSD)}` : '—'}</span></td>
                    <td className={styles.cellMuted} title={en.note || ''}>{en.note || '—'}</td>
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

      {/* ── Returns Section ── */}
      <div className={`${e.tableSection} ${styles.sectionSpacer}`}>
        <div className={styles.sectionBar}>
          <h2 className={styles.sectionHeading}>Zwroty produktów</h2>
          <button
            className={styles.actionBtn}
            onClick={() => { setEditReturn(null); setReturnForm(emptyReturnForm); setShowReturnModal(true); }}
          >
            + Dodaj zwrot
          </button>
        </div>
        {returns.length === 0 ? (
          <div className={styles.noProductsPlaceholder}>
            <span className={styles.emptyTitle}>Brak zwrotów</span>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Kwota zwrotu (CNY)</th>
                  <th>Produkt/Zamówienie</th>
                  <th>Powód</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {[...returns].reverse().map((ret) => (
                  <tr key={ret._id}>
                    <td className={styles.cellStrong}>{fmtDate(ret.date)}</td>
                    <td><span className={`${e.numBadge} ${e.negative}`}>-¥{fmt(ret.returnAmountCNY)}</span></td>
                    <td>{ret.productRef || '—'}</td>
                    <td className={styles.cellMuted} title={ret.reason || ''}>{ret.reason || '—'}</td>
                    <td className={styles.actions}>
                      <button className={styles.editBtn} onClick={() => openEditReturn(ret)}>Edytuj</button>
                      <button className={styles.deleteBtn} onClick={() => handleDeleteReturn(ret._id)}>Usuń</button>
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
          <div className={`${styles.adminModal} ${styles.modalMd}`}>
            <div className={styles.modalHeader}>
              <h2>{editEntry ? 'Edytuj wpis' : 'Nowy wpis'}</h2>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Zamknij">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div>
                <label className={e.formLabel}>Data</label>
                <input type="date" value={form.date} required onChange={ev => setForm({ ...form, date: ev.target.value })} />
              </div>
              <div>
                <label className={e.formLabel}>Sprzedaż od sprzedawcy (CNY ¥)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={form.saleCNY} required
                  onChange={ev => setForm({ ...form, saleCNY: ev.target.value })} />
                {form.saleCNY > 0 && (
                  <div className={e.formPreview}>
                    <span>Twoja prowizja ({form.commissionRate}%): <strong>¥{fmt((form.saleCNY * form.commissionRate) / 100)}</strong></span>
                    {rates.CNY_TO_PLN && <span>= <strong>{fmt((form.saleCNY * form.commissionRate / 100) * rates.CNY_TO_PLN)} zł</strong></span>}
                    {rates.CNY_TO_USD && <span>= <strong>${fmt((form.saleCNY * form.commissionRate / 100) * rates.CNY_TO_USD)}</strong></span>}
                  </div>
                )}
              </div>
              <div>
                <label className={e.formLabel}>Twoja prowizja (%)</label>
                <div className={e.sliderWrap}>
                  <input type="range" min="1" max="100" value={form.commissionRate}
                    onChange={ev => setForm({ ...form, commissionRate: Number(ev.target.value) })} className={e.slider} />
                  <span className={e.sliderValue}>{form.commissionRate}%</span>
                </div>
              </div>
              <div>
                <label className={e.formLabel}>Notatka</label>
                <textarea placeholder="Opcjonalna notatka..." value={form.note}
                  onChange={ev => setForm({ ...form, note: ev.target.value })} rows={2} />
              </div>
              <div className={styles.modalActions}>
                <button type="submit">
                  {editEntry ? 'Zapisz zmiany' : 'Dodaj wpis'}
                </button>
                <button type="button" onClick={closeModal}>
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

      {/* ── Return Modal ── */}
      {showReturnModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.adminModal} ${styles.modalMd}`}>
            <div className={styles.modalHeader}>
              <h2>{editReturn ? 'Edytuj zwrot' : 'Nowy zwrot'}</h2>
              <button type="button" className={styles.iconBtn} onClick={closeReturnModal} aria-label="Zamknij">&times;</button>
            </div>
            <form onSubmit={handleReturnSubmit}>
              <div>
                <label className={e.formLabel}>Data zwrotu</label>
                <input type="date" value={returnForm.date} required onChange={ev => setReturnForm({ ...returnForm, date: ev.target.value })} />
              </div>
              <div>
                <label className={e.formLabel}>Kwota zwrotu (CNY ¥)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={returnForm.returnAmountCNY} required
                  onChange={ev => setReturnForm({ ...returnForm, returnAmountCNY: ev.target.value })} />
                {returnForm.returnAmountCNY > 0 && (
                  <div className={`${e.formPreview} ${e.formPreviewNegative}`}>
                    <span>Odliczenie: <strong>-¥{fmt(returnForm.returnAmountCNY)}</strong></span>
                    {rates.CNY_TO_PLN && <span>= <strong>-{fmt(returnForm.returnAmountCNY * rates.CNY_TO_PLN)} zł</strong></span>}
                    {rates.CNY_TO_USD && <span>= <strong>-${fmt(returnForm.returnAmountCNY * rates.CNY_TO_USD)}</strong></span>}
                  </div>
                )}
              </div>
              <div>
                <label className={e.formLabel}>Produkt / numer zamówienia</label>
                <input type="text" placeholder="np. Zamówienie #12345 lub Yeezy 350" value={returnForm.productRef}
                  onChange={ev => setReturnForm({ ...returnForm, productRef: ev.target.value })} />
              </div>
              <div>
                <label className={e.formLabel}>Powód zwrotu</label>
                <textarea placeholder="Opcjonalny powód zwrotu..." value={returnForm.reason}
                  onChange={ev => setReturnForm({ ...returnForm, reason: ev.target.value })} rows={2} />
              </div>
              <div className={styles.modalActions}>
                <button type="submit">
                  {editReturn ? 'Zapisz zmiany' : 'Dodaj zwrot'}
                </button>
                <button type="button" onClick={closeReturnModal}>
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toasts ── */}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
            <span className={styles.toastIcon} aria-hidden="true" />
            <span className={styles.toastMessage}>{toast.msg}</span>
            <button className={styles.toastClose} onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))}>&times;</button>
          </div>
        ))}
      </div>

    </div>
  );
}
