'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '@/styles/Admin.module.css';
import kakoStyles from '@/styles/AdminKakobuy.module.css';

// ─── helpers ────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function calcGrowthRate(entries) {
  if (!entries || entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0].registrations || 0;
  const last  = sorted[sorted.length - 1].registrations || 0;
  if (first === 0) return null;
  return (((last - first) / first) * 100).toFixed(1);
}

function KpiCard({ value, label, sub, color = '#a78bfa' }) {
  return (
    <div className={kakoStyles.kpiCard}>
      <div className={kakoStyles.kpiLabel}>
        <span className={kakoStyles.kpiDot} style={{ background: color }} />
        {label}
      </div>
      <div className={kakoStyles.kpiValue}>{value ?? '—'}</div>
      {sub && <div className={kakoStyles.kpiSub}>{sub}</div>}
    </div>
  );
}

function MiniBarChart({ entries, field, color }) {
  if (!entries || entries.length === 0) return null;
  const max = Math.max(...entries.map(e => e[field] || 0), 1);
  return (
    <div className={kakoStyles.miniBarChart}>
      {entries.map((e, i) => (
        <div key={i} className={kakoStyles.miniBarCol} title={`${formatDate(e.date)}: ${e[field] || 0}`}>
          <div className={kakoStyles.miniBar} style={{ height: `${((e[field] || 0) / max) * 100}%`, background: color }} />
          <span className={kakoStyles.miniBarLabel}>{formatDate(e.date).slice(0, 5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function KakobuyPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalValue, setGoalValue] = useState(0);
  const [editingEntry, setEditingEntry] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const emptyForm = { date: '', registrations: '', activeMembers: '', predictedMembers: '', notes: '' };
  const [formData, setFormData] = useState(emptyForm);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const askConfirmation = useCallback((title, message, onConfirm) => {
    setConfirmModal({
      isOpen: true, title, message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
      },
    });
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kakobuy');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setEntries(data.entries || []);
      // Load goal from latest entry or default to 0
      const sorted = [...(data.entries || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
      setGoalValue(sorted[0]?.predictedMembers || 0);
    } catch {
      showToast('Błąd pobierania danych.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingEntry ? 'PUT' : 'POST';
    const url = editingEntry ? `/api/kakobuy/${editingEntry._id}` : '/api/kakobuy';
    const payload = {
      date: formData.date,
      registrations: Number(formData.registrations) || 0,
      activeMembers: Number(formData.activeMembers) || 0,
      predictedMembers: Number(formData.predictedMembers) || 0,
      revenue: 0, // Auto-calculated on backend or client
      notes: formData.notes,
    };
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      showToast(editingEntry ? 'Zaktualizowano wpis!' : 'Dodano wpis!', 'success');
      fetchEntries();
      closeModal();
    } catch {
      showToast('Błąd zapisu.', 'error');
    }
  };

  const handleDelete = useCallback((id) => {
    askConfirmation('Usuń wpis', 'Czy na pewno chcesz usunąć ten wpis?', async () => {
      try {
        const res = await fetch(`/api/kakobuy/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        showToast('Wpis usunięty.', 'success');
        fetchEntries();
      } catch {
        showToast('Błąd usuwania.', 'error');
      }
    });
  }, [askConfirmation, showToast, fetchEntries]);

  const openEdit = useCallback((entry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date ? new Date(entry.date).toISOString().split('T')[0] : '',
      registrations: entry.registrations ?? '',
      activeMembers: entry.activeMembers ?? '',
      predictedMembers: entry.predictedMembers ?? '',
      notes: entry.notes ?? '',
    });
    setShowModal(true);
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setEditingEntry(null);
    setFormData(emptyForm);
  };

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate TOTALS (sum of all entries)
  const totalRegistrations = entries.reduce((sum, e) => sum + (e.registrations || 0), 0);
  const activeNow = entries.reduce((sum, e) => sum + (e.activeMembers || 0), 0);
  const predicted = goalValue || entries.reduce((sum, e) => sum + (e.predictedMembers || 0), 0);
  
  // Automatic revenue calculation: $200 per (50 registrations + 5 active)
  // Take the minimum of both ratios to find complete "packages"
  const packagesFromRegistrations = totalRegistrations / 50;
  const packagesFromActive = activeNow / 5;
  const completePackages = Math.min(packagesFromRegistrations, packagesFromActive);
  const revenue = Math.floor(completePackages * 200);
  
  const growth = calcGrowthRate(sorted);
  const conversionRate = totalRegistrations > 0
    ? ((activeNow / totalRegistrations) * 100).toFixed(1)
    : '0.0';

  return (
    <div className={styles.adminContainer}>
      <header className={styles.adminHeader}>
        <div>
          <h1>Kakobuy</h1>
          <p className={styles.headerSubtitle}>
            Rejestracje, aktywni członkowie i prognozy
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={() => setShowGoalModal(true)}
          >
            Ustaw cel
          </button>
          <button className={styles.scraperBtn} onClick={() => { setEditingEntry(null); setFormData(emptyForm); setShowModal(true); }}>
            + Dodaj wpis
          </button>
        </div>
      </header>

      <div className={kakoStyles.kpiGrid}>
        <KpiCard value={totalRegistrations.toLocaleString()} label="Łączne rejestracje"
          sub={growth !== null ? `${growth > 0 ? '▲' : '▼'} ${Math.abs(growth)}% wzrost` : null} color="#a78bfa" />
        <KpiCard value={activeNow.toLocaleString()} label="Aktywni członkowie"
          sub={`Konwersja: ${conversionRate}%`} color="#34d399" />
        <KpiCard value={predicted.toLocaleString()} label="Przewidywani członkowie"
          sub="Cel / prognoza" color="#60a5fa" />
        <KpiCard value={`$${revenue.toLocaleString()}`} label="Szacowany przychód"
          sub="Automatycznie obliczony" color="#fbbf24" />
      </div>

      {sorted.length > 1 && (
        <div className={kakoStyles.chartsRow}>
          <div className={kakoStyles.chartCard}>
            <h3>Rejestracje w czasie</h3>
            <MiniBarChart entries={sorted} field="registrations" color="#a78bfa" />
          </div>
          <div className={kakoStyles.chartCard}>
            <h3>Aktywni w czasie</h3>
            <MiniBarChart entries={sorted} field="activeMembers" color="#34d399" />
          </div>
          <div className={kakoStyles.chartCard}>
            <h3>Przewidywani w czasie</h3>
            <MiniBarChart entries={sorted} field="predictedMembers" color="#71717a" />
          </div>
        </div>
      )}

      <div className={kakoStyles.gaugeRow}>
        <div className={kakoStyles.gaugeCard}>
          <h3>Konwersja (rejestracja → aktywny)</h3>
          <div className={kakoStyles.gaugeTrack}>
            <div className={kakoStyles.gaugeFill} style={{ width: `${Math.min(parseFloat(conversionRate), 100)}%` }} />
          </div>
          <div className={kakoStyles.gaugeLabels}>
            <span>0%</span>
            <span className={kakoStyles.gaugeValue}>{conversionRate}%</span>
            <span>100%</span>
          </div>
        </div>
        {predicted > 0 && (
          <div className={kakoStyles.gaugeCard}>
            <h3>Postęp do celu</h3>
            <div className={kakoStyles.gaugeTrack}>
              <div className={kakoStyles.gaugeFillBlue} style={{ width: `${predicted > 0 ? Math.min((activeNow / predicted) * 100, 100) : 0}%` }} />
            </div>
            <div className={kakoStyles.gaugeLabels}>
              <span>0</span>
              <span className={kakoStyles.gaugeValue}>
                {activeNow.toLocaleString()} / {predicted.toLocaleString()} ({predicted > 0 ? Math.min(((activeNow / predicted) * 100), 100).toFixed(1) : 0}%)
              </span>
              <span>{predicted.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className={kakoStyles.tableSection}>
        <div className={styles.sectionBar}>
          <h2 className={styles.sectionHeading}>Historia wpisów</h2>
        </div>
        {loading ? (
          <div className={styles.spinnerContainer}>
            <div className={styles.loadingSpinner} />
            <p>Ładowanie...</p>
          </div>
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
                  <th>Data</th><th>Rejestracje</th><th>Aktywni</th>
                  <th>Przewidywani</th><th>Przychód ($)</th><th>Konwersja</th>
                  <th>Notatki</th><th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {[...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => {
                  const conv = entry.registrations > 0
                    ? ((entry.activeMembers / entry.registrations) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={entry._id}>
                      <td className={styles.cellStrong}>{formatDate(entry.date)}</td>
                      <td><span className={kakoStyles.numBadge}>{(entry.registrations || 0).toLocaleString()}</span></td>
                      <td><span className={kakoStyles.numBadge}>{(entry.activeMembers || 0).toLocaleString()}</span></td>
                      <td><span className={kakoStyles.numBadge}>{(entry.predictedMembers || 0).toLocaleString()}</span></td>
                      <td className={styles.numCell}>${(entry.revenue || 0).toLocaleString()}</td>
                      <td>
                        <div className={kakoStyles.convBar}>
                          <div className={kakoStyles.convTrack}>
                            <div className={kakoStyles.convFill} style={{ width: `${Math.min(parseFloat(conv), 100)}%` }} />
                          </div>
                          <span className={kakoStyles.convLabel}>{conv}%</span>
                        </div>
                      </td>
                      <td className={styles.cellMuted} title={entry.notes || ''}>{entry.notes || '—'}</td>
                      <td className={styles.actions}>
                        <button className={styles.editBtn} onClick={() => openEdit(entry)}>Edytuj</button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(entry._id)}>Usuń</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.adminModal} ${styles.modalMd}`}>
            <div className={styles.modalHeader}>
              <h2>{editingEntry ? 'Edytuj wpis' : 'Nowy wpis'}</h2>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Zamknij">&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div>
                <label className={kakoStyles.formLabel}>Data</label>
                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className={kakoStyles.formGrid}>
                <div>
                  <label className={kakoStyles.formLabel}>Rejestracje</label>
                  <input type="number" min="0" placeholder="0" value={formData.registrations}
                    onChange={e => setFormData({ ...formData, registrations: e.target.value })} />
                </div>
                <div>
                  <label className={kakoStyles.formLabel}>Aktywni członkowie</label>
                  <input type="number" min="0" placeholder="0" value={formData.activeMembers}
                    onChange={e => setFormData({ ...formData, activeMembers: e.target.value })} />
                </div>
                <div>
                  <label className={kakoStyles.formLabel}>Przewidywani członkowie</label>
                  <input type="number" min="0" placeholder="0" value={formData.predictedMembers}
                    onChange={e => setFormData({ ...formData, predictedMembers: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={kakoStyles.formLabel}>Notatki</label>
                <textarea placeholder="Opcjonalne notatki..." value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} />
              </div>
              <div className={styles.modalActions}>
                <button type="submit">
                  {editingEntry ? 'Zapisz zmiany' : 'Dodaj wpis'}
                </button>
                <button type="button" onClick={closeModal}>
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.adminModal} ${styles.confirmModal}`}>
            <h2>{confirmModal.title}</h2>
            <p>{confirmModal.message}</p>
            <div className={styles.modalActions}>
              <button onClick={confirmModal.onConfirm} className={styles.confirmModalBtn}>Tak, usuń</button>
              <button type="button" onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })} className={styles.cancelModalBtn}>Anuluj</button>
            </div>
          </div>
        </div>
      )}

      {showGoalModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.adminModal} ${styles.modalSm}`}>
            <div className={styles.modalHeader}>
              <h2>Ustaw cel</h2>
              <button type="button" className={styles.iconBtn} onClick={() => setShowGoalModal(false)} aria-label="Zamknij">&times;</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowGoalModal(false);
              showToast('Cel zaktualizowany!', 'success');
            }}>
              <div>
                <label className={kakoStyles.formLabel}>Cel aktywnych członków</label>
                <input 
                  type="number" 
                  min="0" 
                  placeholder="0" 
                  value={goalValue}
                  onChange={e => setGoalValue(Number(e.target.value))} 
                />
                <p className={styles.formHint}>
                  Aktualnie: {activeNow.toLocaleString()} / {goalValue.toLocaleString()} członków
                </p>
              </div>
              <div className={styles.modalActions}>
                <button type="submit">
                  Zapisz cel
                </button>
                <button type="button" onClick={() => setShowGoalModal(false)}>
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div key={toast.id} className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
            <span className={styles.toastIcon} aria-hidden="true" />
            <span className={styles.toastMessage}>{toast.message}</span>
            <button className={styles.toastClose} onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}
