// src/components/VideoSection.js
import styles from '@/styles/VideoSection.module.css';

export default function VideoSection() {
  return (
    <section className={`${styles.videoSection} py-5`}>
      <div className="container">
        <h2 className="text-center mb-5">Check Out Our Latest <span className="highlight">Videos!</span></h2>
        <h2 className="text-center mb-5">You<span className="highlight">Tube!</span></h2>
        <div className="row">
          {[
            'https://www.youtube.com/embed/Y4SZ4zqjAp4',
            'https://www.youtube.com/embed/Y4SZ4zqjAp4',
            'https://www.youtube.com/embed/Y4SZ4zqjAp4',
          ].map((src, index) => (
            <div key={index} className="col-lg-4 col-md-6 mb-4">
              <div className="embed-responsive embed-responsive-16by9">
                <iframe
                  className="embed-responsive-item"
                  src={src}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          ))}
        </div>
        <h2 className="text-center mb-5">Tik<span className="highlight">Tok!</span></h2>
        <div className="row justify-content-center">
          {[
            'https://www.tiktok.com/player/v1/7493141760688852244?autoplay=0&controls=1',
            'https://www.tiktok.com/player/v1/7493141760688852244?autoplay=0&controls=1',
            'https://www.tiktok.com/player/v1/7493141760688852244?autoplay=0&controls=1',
          ].map((src, index) => (
            <div key={index} className="col-lg-4 col-md-6 mb-4 d-flex justify-content-center">
              <iframe
                id={`tiktok-video-${index + 1}`}
                className="tiktok-embed"
                width="325"
                height="605"
                src={src}
                allowFullScreen
                allow="autoplay; fullscreen"
                style={{ border: 'none' }}
              ></iframe>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}