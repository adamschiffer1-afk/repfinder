// src/components/PluginTutorials.js
import Image from 'next/image';
import dynamic from 'next/dynamic';
import styles from '@/styles/PluginTutorials.module.css';

const ReactPlayer = dynamic(() => import('react-player/youtube'), {
  ssr: false,
  loading: () => (
    <div className={styles['video-loading']}>
      Ładowanie wideo...
    </div>
  ),
});

export default function PluginTutorials() {
  return (
    <section className={`${styles['plugin-tutorials-section']} py-5`}>
      <div className="container">
        <h2 className="text-center mb-4">
          Nasza Wtyczka <span className={styles.highlight}>Usuwa Warn/Remind</span>
        </h2>
        <p className="text-center mb-5">
          Posiadamy dedykowaną wtyczkę, która usuwa ostrzeżenia <b>Warn Remind oraz pokazuje Quality Check</b>. Sprawdź jak jej używać w naszych poradnikach poniżej!
        </p>
        <div className="row justify-content-center mb-5">
          <div className="col-lg-6 text-center">
            <a
              href="https://chromewebstore.google.com/detail/warn-reminder-removal/gjhijhnbbffbipkcejiejphnladneboi?authuser=0&hl=pl"
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles['btn-primary']} btn btn-lg`}
            >
              Pobierz Wtyczkę z Chrome Web Store
            </a>
          </div>
        </div>
        <div className="row justify-content-center">
          <div className="col-lg-4 col-md-6 mb-4">
            <div className={`${styles.card} h-100`}>
              <Image
                src="/jpg/wtyczka.png"
                className="card-img-top rounded-top"
                alt="Logo Wtyczki"
                width={300}
                height={150}
                style={{ objectFit: 'contain' }}
                loading="lazy"
              />
              <div className="card-body text-center">
                <h5 className={styles['card-title']}>Krok 1: Pobranie Wtyczki</h5>
                <p className={styles['card-text']}>
                  Aby rozpocząć, pobierz naszą wtyczkę z Chrome Web Store klikając poniżej. Upewnij się, że masz zainstalowaną przeglądarkę Google Chrome/Brave lub inną która korzysta z silnika chromium.
                </p>
                <a
                  href="https://chromewebstore.google.com/detail/warn-reminder-removal/gjhijhnbbffbipkcejiejphnladneboi?authuser=0&hl=pl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['btn-outline-primary']}
                >
                  Pobierz Wtyczkę
                </a>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6 mb-4">
            <div className={`${styles.card} h-100 ${styles['video-section']}`}>
              <div className={`${styles['embed-responsive']} position-relative`}>
                <ReactPlayer
                  url="https://www.youtube.com/watch?v=Y4SZ4zqjAp4"
                  className={styles['embed-responsive-item']}
                  width="100%"
                  height="100%"
                  controls 
                  light 
                  playing={false} 
                  title="Jak działa nasza wtyczka" 
                  fallback={
                    <div className={styles['video-loading']}>
                      Ładowanie wideo...
                    </div>
                  }
                  config={{
                    youtube: {
                      playerVars: {
                        modestbranding: 1, 
                        rel: 0, 
                        showinfo: 0, 
                        controls: 1, 
                        fs: 0, 
                        iv_load_policy: 3, 
                        cc_load_policy: 0,
                      },
                    },
                  }}
                />
              </div>
              <div className="card-body text-center">
                <h5 className={styles['card-title']}>Krok 2: Jak działa wtyczka?</h5>
                <p className={styles['card-text']}>
                  Zobacz, jak nasza wtyczka działa i jakie ma funkcje, oglądając film poniżej.
                </p>
                <a
                  href="https://www.youtube.com/watch?v=Y4SZ4zqjAp4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['btn-outline-primary']}
                >
                  Obejrzyj Film
                </a>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6 mb-4">
            <div className={`${styles.card} h-100`}>
              <Image
                src="/jpg/pytajning.png"
                className="card-img-top rounded-top"
                alt="Znak zapytania"
                width={300}
                height={150}
                style={{ objectFit: 'contain' }}
                loading="lazy" 
              />
              <div className="card-body text-center">
                <h5 className={styles['card-title']}>Krok 3: Co robi wtyczka?</h5>
                <p className={styles['card-text']}>
                  Nasza wtyczka skutecznie usuwa ostrzeżenia Warn Remind oraz pokazuje Quality Check. Dzięki niej możesz skupić się na ważniejszych zadaniach, eliminując niepotrzebne powiadomienia!
                </p>
                <a
                  href="https://discord.gg/vectoreps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['btn-outline-primary']}
                >
                  Dowiedz się więcej na discordzie!
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}