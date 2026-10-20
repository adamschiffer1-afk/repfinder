'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import styles from '@/styles/FaqSection.module.css';
import useScrollAnimation from '@/hooks/useScrollAnimation';
import { useLanguage } from '@/context/LanguageContext';

export default function FaqSection() {
  const { t } = useLanguage();
  const [activeFaq, setActiveFaq] = useState(null);
  const answerRefs = useRef([]);
  const [sectionRef, isVisible] = useScrollAnimation({ threshold: 0.15 });

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = useMemo(
    () => [
      { 
        question: t('faq.q1'), 
        answer: t('faq.a1') 
      },
      { 
        question: t('faq.q2'), 
        answer: t('faq.a2') 
      },
      { 
        question: t('faq.q3'), 
        answer: t('faq.a3') 
      },
      { 
        question: t('faq.q4'), 
        answer: t('faq.a4') 
      },
    ],
    [t]
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
    <section ref={sectionRef} className={`${styles.section} ${isVisible ? styles.visible : ''}`}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>{t('faq.eyebrow')}</p>
          <h2 className={styles.title}>
            {t('faq.title')} <span className={styles.titleHighlight}>{t('faq.titleHighlight')}</span>
          </h2>
        </div>

        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`${styles.faqItem} ${activeFaq === index ? styles.faqItemActive : ''}`}
              style={{ '--delay': `${index * 0.08}s` }}
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
