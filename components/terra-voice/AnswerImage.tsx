'use client';
import Image from 'next/image';
import styles from './answer-image.module.css';

type Props = { imageUrl?: string; title: string; loading: boolean; error?: string };

export default function AnswerImage({ imageUrl, title, loading, error }: Props) {
  const safeImage = imageUrl?.startsWith('data:image/png;base64,') ? imageUrl : undefined;
  if (!loading && !safeImage && !error) return null;
  return <figure className={styles.plate}>
    <figcaption><span>{title}</span><small>Generated visual</small></figcaption>
    <div className={styles.body}>
      {loading ? <div className={styles.loading} role="status" aria-label="Generating visual explanation"/> : null}
      {safeImage ? <Image src={safeImage} alt={title} width={1024} height={1024} unoptimized/> : null}
      {error && !loading ? <p role="status">{error}</p> : null}
    </div>
  </figure>;
}
