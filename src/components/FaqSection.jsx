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
    <section className={`${styles.faqSection} py-5`}>
      <div className="container">
        <h2 className={`${styles.sectionTitle} text-center mb-4`}>
          Frequently Asked <span className={styles.highlight}>Questions</span>
        </h2>
        <div className={styles.faqItems}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`${styles.faqItem} ${activeFaq === index ? styles.faqItemActive : ''}`}
            >
              <div
                className={`${styles.faqQuestion} d-flex justify-content-between align-items-center`}
                onClick={() => toggleFaq(index)}
              >
                <h3 className="mb-0">{faq.question}</h3>
                <span className={styles.faqToggle}>
                  {activeFaq === index ? '−' : '+'}
                </span>
              </div>
              <div
                className={styles.faqAnswer}
                ref={(el) => (answerRefs.current[index] = el)}
                style={{
                  maxHeight: activeFaq === index ? 'none' : '0px', 
                  overflow: 'hidden',
                }}
              >
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}