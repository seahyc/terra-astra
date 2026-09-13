'use client';
import Image from 'next/image';
import styles from './answer-image.module.css';

type Props = { imageUrl?: string; title: string; loading: boolean; error?: string };

export default function AnswerImage({ imageUrl, title, loading, error }: Props) {
  const safeImage = imageUrl?.startsWith('data:image/png;base64,') ? imageUrl : undefined;
  if (!loading && !safeImage && !error) return null;

  if (!safeImage) {
    return <div className={`${styles.status} ${error ? styles.failed : ''}`} role="status" aria-live="polite">
      <span className={styles.statusMark} aria-hidden="true" />
      <span className={styles.statusCopy}>
        <strong>{loading ? 'Creating visual' : 'Visual unavailable'}</strong>
        <span>{loading ? title : error}</span>
      </span>
    </div>;
  }

  return <figure className={styles.plate}>
    <figcaption><span>{title}</span><small>Generated visual</small></figcaption>
    <div className={styles.body}>
      <Image src={safeImage} alt={title} width={1024} height={1024} unoptimized/>
    </div>
  </figure>;
}
