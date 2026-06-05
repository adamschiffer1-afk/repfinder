'use client';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faShieldAlt, faDiscord, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faCrown, faRefresh } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/AdminUsers.module.css';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
      setError('Błąd podczas pobierania użytkowników.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const administrators = users.filter(u => u.isAdmin);
  const regularUsers = users.filter(u => !u.isAdmin);

  const formatDate = (dateString) => {
    if (!dateString) return 'Brak danych';
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProviderIcon = (provider) => {
    if (provider === 'discord') return <FontAwesomeIcon icon={faDiscord} className={styles.providerIconDiscord} />;
    if (provider === 'google') return <FontAwesomeIcon icon={faGoogle} className={styles.providerIconGoogle} />;
    return null;
  };

  const UserCard = ({ user, isAdmin }) => (
    <div className={`${styles.userCard} ${isAdmin ? styles.adminCard : styles.regularCard}`}>
      <div className={styles.cardHeader}>
        <div className={styles.avatarSection}>
          {user.image ? (
            <img src={user.image} alt={user.name} className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <FontAwesomeIcon icon={faUser} />
            </div>
          )}
          {isAdmin && (
            <div className={styles.adminBadge}>
              <FontAwesomeIcon icon={faCrown} />
            </div>
          )}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.userName}>
            {user.name || 'Brak nazwy'}
          </div>
          <div className={styles.userEmail}>
            {user.email}
          </div>
          <div className={styles.providerBadge}>
            {getProviderIcon(user.provider)}
            {user.provider === 'discord' ? 'Discord' : 'Google'}
          </div>
        </div>
      </div>
      
      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Dołączył:</span>
          <span className={styles.infoValue}>{formatDate(user.createdAt)}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Ostatnie logowanie:</span>
          <span className={styles.infoValue}>{formatDate(user.lastLogin)}</span>
        </div>
        {user.discordId && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Discord ID:</span>
            <span className={styles.infoValue}>{user.discordId}</span>
          </div>
        )}
        {user.googleId && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Google ID:</span>
            <span className={styles.infoValue}>{user.googleId}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Ładowanie użytkowników...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p>{error}</p>
          <button onClick={fetchUsers} className={styles.retryBtn}>
            <FontAwesomeIcon icon={faRefresh} /> Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Użytkownicy</h1>
          <p className={styles.subtitle}>
            Zarządzaj użytkownikami systemu RepFinder
          </p>
        </div>
        <button onClick={fetchUsers} className={styles.refreshBtn}>
          <FontAwesomeIcon icon={faRefresh} /> Odśwież
        </button>
      </div>

      {/* Statistics */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)' }}>
            <FontAwesomeIcon icon={faCrown} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{administrators.length}</div>
            <div className={styles.statLabel}>Administratorzy</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' }}>
            <FontAwesomeIcon icon={faUser} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{regularUsers.length}</div>
            <div className={styles.statLabel}>Użytkownicy</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' }}>
            <FontAwesomeIcon icon={faShieldAlt} />
          </div>
          <div className={styles.statInfo}>
            <div className={styles.statValue}>{users.length}</div>
            <div className={styles.statLabel}>Łącznie</div>
          </div>
        </div>
      </div>

      {/* Administrators Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleRow}>
            <FontAwesomeIcon icon={faCrown} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Administratorzy</h2>
            <span className={styles.sectionCount}>{administrators.length}</span>
          </div>
          <p className={styles.sectionDesc}>
            Użytkownicy z pełnymi uprawnieniami administracyjnymi
          </p>
        </div>
        
        {administrators.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Brak administratorów</p>
          </div>
        ) : (
          <div className={styles.userGrid}>
            {administrators.map(user => (
              <UserCard key={user._id} user={user} isAdmin={true} />
            ))}
          </div>
        )}
      </section>

      {/* Regular Users Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleRow}>
            <FontAwesomeIcon icon={faUser} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Użytkownicy</h2>
            <span className={styles.sectionCount}>{regularUsers.length}</span>
          </div>
          <p className={styles.sectionDesc}>
            Zwykli użytkownicy systemu RepFinder
          </p>
        </div>
        
        {regularUsers.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Brak użytkowników</p>
          </div>
        ) : (
          <div className={styles.userGrid}>
            {regularUsers.map(user => (
              <UserCard key={user._id} user={user} isAdmin={false} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
