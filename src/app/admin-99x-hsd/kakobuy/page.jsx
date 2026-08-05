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

function KpiCard({ icon, value, label, sub, color = '#a78bfa' }) {
  return (
    <div className={kakoStyles.kpiCard}>
      <div className={kakoStyles.kpiIcon}>{icon}</div>
      <div className={kakoStyles.kpiValue} style={{ color }}>{value ?? '—'}</div>
      <div className={kakoStyles.kpiLabel}>{label}</div>
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
          <h1>🛒 Kakobuy — Rejestry i Analizy</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontSize: '14px' }}>
            Śledź rejestracje, aktywnych członków i prognozy
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={styles.scraperBtn} 
            onClick={() => setShowGoalModal(true)}
            style={{ background: 'rgba(96, 165, 250, 0.2)', border: '1px solid #60a5fa' }}
          >
            🎯 Ustaw cel
          </button>
          <button className={styles.scraperBtn} onClick={() => { setEditingEntry(null); setFormData(emptyForm); setShowModal(true); }}>
            + Dodaj wpis
          </button>
        </div>
      </header>

      <div className={kakoStyles.kpiGrid}>
        <KpiCard icon="📋" value={totalRegistrations.toLocaleString()} label="Łączne rejestracje"
          sub={growth !== null ? `${growth > 0 ? '▲' : '▼'} ${Math.abs(growth)}% wzrost` : null} color="#a78bfa" />
        <KpiCard icon="✅" value={activeNow.toLocaleString()} label="Aktywni członkowie"
          sub={`Konwersja: ${conversionRate}%`} color="#34d399" />
        <KpiCard icon="🔮" value={predicted.toLocaleString()} label="Przewidywani członkowie"
          sub="Cel / prognoza" color="#60a5fa" />
        <KpiCard icon="💰" value={`$${revenue.toLocaleString()}`} label="Szacowany przychód"
          sub="Automatycznie obliczony" color="#fbbf24" />
      </div>

      {sorted.length > 1 && (
        <div className={kakoStyles.chartsRow}>
          <div className={kakoStyles.chartCard}>
            <h3>📋 Rejestracje w czasie</h3>
            <MiniBarChart entries={sorted} field="registrations" color="linear-gradient(180deg,#a78bfa,#7c3aed)" />
          </div>
          <div className={kakoStyles.chartCard}>
            <h3>✅ Aktywni w czasie</h3>
            <MiniBarChart entries={sorted} field="activeMembers" color="linear-gradient(180deg,#34d399,#059669)" />
          </div>
          <div className={kakoStyles.chartCard}>
            <h3>🔮 Przewidywani w czasie</h3>
            <MiniBarChart entries={sorted} field="predictedMembers" color="linear-gradient(180deg,#60a5fa,#2563eb)" />
          </div>
        </div>
      )}

      <div className={kakoStyles.gaugeRow}>
        <div className={kakoStyles.gaugeCard}>
          <h3>📊 Wskaźnik konwersji (rejestracja → aktywny)</h3>
          <div className={kakoStyles.gaugeTrack}>
            <div className={kakoStyles.gaugeFill} style={{ width: `${Math.min(parseFloat(conversionRate), 100)}%` }} />
          </div>
          <div className={kakoStyles.gaugeLabels}>
            <span>0%</span>
            <span style={{ color: '#34d399', fontWeight: 700 }}>{conversionRate}%</span>
            <span>100%</span>
          </div>
        </div>
        {predicted > 0 && (
          <div className={kakoStyles.gaugeCard}>
            <h3>🎯 Postęp do celu</h3>
            <div className={kakoStyles.gaugeTrack}>
              <div className={kakoStyles.gaugeFillBlue} style={{ width: `${predicted > 0 ? Math.min((activeNow / predicted) * 100, 100) : 0}%` }} />
            </div>
            <div className={kakoStyles.gaugeLabels}>
              <span>0</span>
              <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                {activeNow.toLocaleString()} / {predicted.toLocaleString()} ({predicted > 0 ? Math.min(((activeNow / predicted) * 100), 100).toFixed(1) : 0}%)
              </span>
              <span>{predicted.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className={kakoStyles.tableSection}>
        <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}>
          📅 Historia wpisów
        </h2>
        {loading ? (
          <div className={styles.spinnerContainer}>
            <div className={styles.loadingSpinner} />
            <p style={{ marginTop: '10px' }}>Ładowanie...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.noProductsPlaceholder}>
            📭 Brak wpisów. Dodaj pierwszy wpis klikając przycisk powyżej.
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
                      <td style={{ fontWeight: 700, color: '#a78bfa' }}>{formatDate(entry.date)}</td>
                      <td><span className={kakoStyles.numBadge} style={{ '--c': '#a78bfa' }}>{(entry.registrations || 0).toLocaleString()}</span></td>
                      <td><span className={kakoStyles.numBadge} style={{ '--c': '#34d399' }}>{(entry.activeMembers || 0).toLocaleString()}</span></td>
                      <td><span className={kakoStyles.numBadge} style={{ '--c': '#60a5fa' }}>{(entry.predictedMembers || 0).toLocaleString()}</span></td>
                      <td style={{ color: '#fbbf24', fontWeight: 700 }}>${(entry.revenue || 0).toLocaleString()}</td>
                      <td>
                        <div className={kakoStyles.convBar}>
                          <div className={kakoStyles.convFill} style={{ width: `${Math.min(parseFloat(conv), 100)}%` }} />
                          <span className={kakoStyles.convLabel}>{conv}%</span>
                        </div>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                        {entry.notes || '—'}
                      </td>
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
          <div className={styles.adminModal} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>{editingEntry ? '✏️ Edytuj wpis' : '➕ Nowy wpis'}</h2>
              <span style={{ fontSize: '24px', cursor: 'pointer', opacity: 0.5 }} onClick={closeModal}>&times;</span>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className={kakoStyles.formLabel}>Data</label>
                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff', colorScheme: 'dark' }} />
              </div>
              <div className={kakoStyles.formGrid}>
                <div>
                  <label className={kakoStyles.formLabel}>📋 Rejestracje</label>
                  <input type="number" min="0" placeholder="0" value={formData.registrations}
                    onChange={e => setFormData({ ...formData, registrations: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div>
                  <label className={kakoStyles.formLabel}>✅ Aktywni członkowie</label>
                  <input type="number" min="0" placeholder="0" value={formData.activeMembers}
                    onChange={e => setFormData({ ...formData, activeMembers: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }} />
                </div>
                <div>
                  <label className={kakoStyles.formLabel}>🔮 Przewidywani członkowie</label>
                  <input type="number" min="0" placeholder="0" value={formData.predictedMembers}
                    onChange={e => setFormData({ ...formData, predictedMembers: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff' }} />
                </div>
              </div>
              <div>
                <label className={kakoStyles.formLabel}>📝 Notatki</label>
                <textarea placeholder="Opcjonalne notatki..." value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff', resize: 'vertical', font: 'inherit' }} />
              </div>
              <div className={styles.modalActions}>
                <button type="submit" style={{ background: '#a78bfa', color: '#000', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', flex: 1 }}>
                  {editingEntry ? 'Zapisz zmiany' : 'Dodaj wpis'}
                </button>
                <button type="button" onClick={closeModal} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', flex: 1 }}>
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
          <div className={styles.adminModal} style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🎯 Ustaw cel</h2>
              <span style={{ fontSize: '24px', cursor: 'pointer', opacity: 0.5 }} onClick={() => setShowGoalModal(false)}>&times;</span>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowGoalModal(false);
              showToast('Cel zaktualizowany!', 'success');
            }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className={kakoStyles.formLabel}>🔮 Cel aktywnych członków</label>
                <input 
                  type="number" 
                  min="0" 
                  placeholder="0" 
                  value={goalValue}
                  onChange={e => setGoalValue(Number(e.target.value))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '18px', fontWeight: '700' }} 
                />
                <p style={{ marginTop: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  Aktualnie: {activeNow.toLocaleString()} / {goalValue.toLocaleString()} członków
                </p>
              </div>
              <div className={styles.modalActions}>
                <button type="submit" style={{ background: '#60a5fa', color: '#000', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', flex: 1 }}>
                  Zapisz cel
                </button>
                <button type="button" onClick={() => setShowGoalModal(false)} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer', flex: 1 }}>
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
            <span className={styles.toastIcon}>{toast.type === 'success' ? '⚡' : '⚠️'}</span>
            <span className={styles.toastMessage}>{toast.message}</span>
            <button className={styles.toastClose} onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}
