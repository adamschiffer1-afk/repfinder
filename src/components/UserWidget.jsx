'use client';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSignOutAlt, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/UserWidget.module.css';

export default function UserWidget() {
  const { data: session, status } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);

  if (status === 'loading' || !session?.user) {
    return null;
  }

  const isAdmin = session.user.isAdmin === true;

  return (
    <div className={styles.widgetContainer}>
      <div 
        className={styles.widget}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Badge na górze */}
        <div className={styles.badgeWrapper}>
          <span className={`${styles.roleBadge} ${isAdmin ? styles.adminBadge : styles.userBadge}`}>
            {isAdmin ? 'Administrator' : 'Użytkownik'}
          </span>
        </div>

        {/* Avatar i nazwa */}
        <div className={styles.userContent}>
          <div className={styles.avatarWrapper}>
            {session.user.image ? (
              <img 
                src={session.user.image} 
                alt={session.user.name || 'User'} 
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <FontAwesomeIcon icon={faUser} />
              </div>
            )}
          </div>
          <div className={styles.userName}>
            {session.user.name || 'User'}
          </div>
        </div>

        {/* Expanded menu */}
        {isExpanded && (
          <div className={styles.expandedMenu}>
            <button 
              className={styles.logoutBtn}
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              Wyloguj się
            </button>
          </div>
        )}

        {/* Chevron indicator */}
        <div className={styles.expandIndicator}>
          <FontAwesomeIcon 
            icon={faChevronUp} 
            className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
          />
        </div>
      </div>
    </div>
  );
}
