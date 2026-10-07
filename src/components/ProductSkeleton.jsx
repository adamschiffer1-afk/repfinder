import styles from '@/styles/ProductSkeleton.module.css';

export default function ProductSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonImage}></div>
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonPrice}></div>
        <div className={styles.skeletonBadge}></div>
      </div>
    </div>
  );
}
