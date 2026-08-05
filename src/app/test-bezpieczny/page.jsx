'use client';

export default function TestPage() {
  return (
    <div style={{ padding: '50px', textAlign: 'center', background: '#000', color: '#fff', height: '100vh' }}>
      <h1>Test Bezpieczny 🛡️</h1>
      <p>Jeśli widzisz ten napis, skrypty powinny działać.</p>
      <button 
        onClick={() => alert('BRAWO! JS DZIAŁA!')}
        style={{ padding: '20px', fontSize: '20px', cursor: 'pointer', background: '#a78bfa', border: 'none', borderRadius: '10px' }}
      >
        KLIKNIJ MNIE
      </button>
      <br /><br />
      <a href="/admin" style={{ color: '#aaa' }}>Wróć do admina</a>
    </div>
  );
}
