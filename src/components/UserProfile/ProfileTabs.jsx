'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faThumbsUp, faThumbsDown } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/UserProfile.module.css';

export default function ProfileTabs({ activeTab, setActiveTab }) {
    return (
        <div className={styles.tabsContainer}>
            <button
                className={`${styles.tabBtn} ${activeTab === 'favorites' ? `${styles.active} ${styles.favorites}` : ''}`}
                onClick={() => setActiveTab('favorites')}
            >
                <FontAwesomeIcon icon={faHeart} />
                Ulubione
            </button>
            <button
                className={`${styles.tabBtn} ${activeTab === 'liked' ? styles.active : ''}`}
                onClick={() => setActiveTab('liked')}
            >
                <FontAwesomeIcon icon={faThumbsUp} />
                Polubione
            </button>
            <button
                className={`${styles.tabBtn} ${activeTab === 'disliked' ? `${styles.active} ${styles.disliked}` : ''}`}
                onClick={() => setActiveTab('disliked')}
            >
                <FontAwesomeIcon icon={faThumbsDown} />
                Niepolubione
            </button>
        </div>
    );
}
