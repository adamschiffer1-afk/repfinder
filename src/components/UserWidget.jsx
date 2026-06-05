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
  const userRole = isAdmin ? 'Administrator' : 'User';

  return (
    <div className={styles.widgetContainer}>
      <div 
        className={styles.widget}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className={styles.userProfile}>
          {/* Avatar po lewej */}
          <div className={styles.avatarSection}>
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
            {/* Online status indicator */}
            <div className={styles.statusDot}></div>
          </div>

          {/* Info po prawej */}
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              {session.user.name || 'User'}
            </div>
            <div className={styles.userEmail}>
              {session.user.email || 'No email'}
            </div>
            <div className={`${styles.roleBadge} ${isAdmin ? styles.adminBadge : styles.userBadge}`}>
              {userRole}
            </div>
          </div>
        </div>

        {/* Expanded menu on hover */}
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
