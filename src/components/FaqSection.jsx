'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import styles from '@/styles/FaqSection.module.css';

export default function FaqSection() {
  const [activeFaq, setActiveFaq] = useState(null);
  const answerRefs = useRef([]);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = useMemo(
    () => [
      { 
        question: 'Jak działa zamawianie przez chińskiego agenta?', 
        answer: 'Chiński agent pomaga w zakupie towarów z lokalnych platform (np. 1688, Taobao, Weidian), kontaktuje się ze sprzedawcą, sprawdza jakość produktu, konsoliduje paczki i wysyła je do ciebie.' 
      },
      { 
        question: 'Jak znaleźć najlepsze jakościowo itemy?', 
        answer: 'Nie musisz szukać na ślepo — wyselekcjonowane, sprawdzone jakościowo produkty znajdziesz w zakładce Products na naszej stronie. Regularnie aktualizujemy ją o topowe itemy z dobrym stosunkiem ceny do jakości.' 
      },
      { 
        question: 'Ile trwa dostawa z Chin?', 
        answer: 'Dostawa zazwyczaj zajmuje 8–15 dni roboczych od momentu nadania paczki. Czas zależy od wybranej metody wysyłki i kraju docelowego.' 
      },
      { 
        question: 'Czy moja paczka może zostać złapana przez urząd celny?', 
        answer: 'Ryzyko jest minimalne, jeśli korzystasz ze sprawdzonych i bezpiecznych linii wysyłkowych, takich jak DPD, DHL, ETL czy InPost. Te metody mają dobre statystyki dostarczalności i są regularnie używane do przesyłek międzynarodowych.' 
      },
    ],
    []
  );

  useEffect(() => {
    answerRefs.current = answerRefs.current.slice(0, faqs.length);
  }, [faqs]);

  useEffect(() => {
    if (activeFaq !== null && answerRefs.current[activeFaq]) {
      const height = answerRefs.current[activeFaq].scrollHeight;
      answerRefs.current[activeFaq].style.maxHeight = `${height}px`;
    }
  }, [activeFaq]);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Pomoc</p>
          <h2 className={styles.title}>
            Frequently Asked <span className={styles.titleHighlight}>Questions</span>
          </h2>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`${styles.faqItem} ${activeFaq === index ? styles.faqItemActive : ''}`}
            >
              <button
                className={styles.faqQuestion}
                onClick={() => toggleFaq(index)}
              >
                <span className={styles.questionText}>{faq.question}</span>
                <span className={styles.faqToggle}>
                  {activeFaq === index ? '−' : '+'}
                </span>
              </button>
              <div
                className={styles.faqAnswer}
                ref={(el) => (answerRefs.current[index] = el)}
                style={{
                  maxHeight: activeFaq === index ? 'none' : '0px', 
                  overflow: 'hidden',
                }}
              >
                <p className={styles.answerText}>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
