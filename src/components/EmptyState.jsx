import styles from '@/styles/EmptyState.module.css';

export default function EmptyState({ title = "No products found", description = "Try adjusting your filters or search query" }) {
  return (
    <div className={styles.emptyState}>
      <svg 
        className={styles.emptyIcon}
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="80" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="8 8" />
        <path 
          d="M70 90 L90 110 L130 70" 
          stroke="rgba(255,255,255,0.2)" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          opacity="0.3"
        />
        <circle cx="100" cy="100" r="40" fill="rgba(255,255,255,0.03)" />
        <path 
          d="M85 95 Q100 105 115 95" 
          stroke="rgba(255,255,255,0.15)" 
          strokeWidth="2" 
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <h3 className={styles.emptyTitle}>{title}</h3>
      <p className={styles.emptyDescription}>{description}</p>
    </div>
  );
}
