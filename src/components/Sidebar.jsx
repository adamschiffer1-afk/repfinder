import styles from '@/styles/Sidebar.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord, faTiktok, faYoutube } from '@fortawesome/free-brands-svg-icons';

export default function Sidebar() {
  return (
    <div className={styles.sidebar}>
      <span className={styles.sidebarLink} style={{ cursor: 'default' }}>
        <FontAwesomeIcon icon={faDiscord} />
      </span>
      <span className={styles.sidebarLink} style={{ cursor: 'default' }}> 
        <FontAwesomeIcon icon={faTiktok} />
      </span>
      <span className={styles.sidebarLink} style={{ cursor: 'default' }}>
        <FontAwesomeIcon icon={faYoutube} />
      </span>
      <span className={styles.priceBtn} style={{ cursor: 'default' }}>
        $15
      </span>
    </div>
  );
}