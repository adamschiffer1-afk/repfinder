'use client';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronDown, faCircle } from '@fortawesome/free-solid-svg-icons';
import styles from '@/styles/SettingsModal.module.css';

import { useLanguage } from '@/context/LanguageContext';

export default function SettingsModal({ isOpen, onClose, isInitial = false }) {
  const { t, language, changeLanguage } = useLanguage();
  const [currency, setCurrency] = useState('PLN');
  const [agent, setAgent] = useState('KakoBuy');
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);

  const languages = [
    { code: 'pl', flag: '/images/flag-pl.png', label: 'Polski' },
    { code: 'en', flag: '/images/flag-us.png', label: 'English' },
    { code: 'cn', flag: '/images/flag-cn.png', label: '中文' },
    { code: 'de', flag: '/images/niemcy.png', label: 'Deutsch' },
    { code: 'es', flag: '/images/hiszpania.png', label: 'Español' },
  ];

  useEffect(() => {
    const savedAgent = localStorage.getItem('preferredAgent');
    if (savedAgent) setAgent(savedAgent);
    
    const savedCurrency = localStorage.getItem('preferredCurrency');
    if (savedCurrency) setCurrency(savedCurrency);
  }, []);

  const handleSave = () => {
    localStorage.setItem('preferredAgent', agent);
    localStorage.setItem('preferredCurrency', currency);
    if (isInitial) {
      changeLanguage(selectedLanguage);
    }
    onClose();
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const agents = [
    { name: 'KakoBuy', image: '/images/kako.png' },
    { name: 'ACBuy', image: '/images/allchinabuy.png' },
    { name: 'USFans', image: '/images/usfans.png' },
    { name: 'LitBuy', image: '/images/litbuy.png' },
    { name: 'GTBuy', image: '/images/gtbuy.png' },
    { name: 'OopBuy', image: '/images/oopbuy.png' },
    { name: 'MuleBuy', image: '/images/Mulebuy.jpg' }
  ];

  return (
    <div className={styles.modalOverlay} onClick={() => !isInitial && onClose()}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{isInitial ? "Setup" : t('settings.title')}</h2>
          {!isInitial && (
            <button className={styles.closeBtn} onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        {isInitial && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>LANGUAGE / JĘZYK</h3>
            <div className={styles.dropdownContainer}>
              <div 
                className={styles.dropdownTrigger}
                onClick={() => {
                  setIsLangDropdownOpen(!isLangDropdownOpen);
                  setIsAgentDropdownOpen(false);
                }}
              >
                <div className={styles.agentInfo}>
                  <img src={languages.find(l => l.code === selectedLanguage)?.flag} alt={selectedLanguage} className={styles.agentImg} />
                  <span>{languages.find(l => l.code === selectedLanguage)?.label}</span>
                </div>
                <FontAwesomeIcon icon={faChevronDown} className={styles.chevron} />
              </div>

              {isLangDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {languages.map(l => (
                    <div 
                      key={l.code}
                      className={`${styles.dropdownItem} ${selectedLanguage === l.code ? styles.activeItem : ''}`}
                      onClick={() => {
                        setSelectedLanguage(l.code);
                        setIsLangDropdownOpen(false);
                      }}
                    >
                      <img src={l.flag} alt={l.label} className={styles.agentImg} />
                      <span>{l.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>WALUTA / CURRENCY</h3>
          <div className={styles.currencyGrid}>
            <div 
              className={`${styles.currencyCard} ${currency === 'USD' ? styles.active : ''}`}
              onClick={() => setCurrency('USD')}
            >
              <div className={styles.flag}><img src="/images/flag-us.png" alt="US" className={styles.flagImg} /></div>
              <div className={styles.currencyInfo}>
                <span className={styles.currencyName}>$ USD</span>
              </div>
            </div>
            
            <div 
              className={`${styles.currencyCard} ${currency === 'PLN' ? styles.active : ''}`}
              onClick={() => setCurrency('PLN')}
            >
              <div className={styles.flag}><img src="/images/flag-pl.png" alt="PL" className={styles.flagImg} /></div>
              <div className={styles.currencyInfo}>
                <span className={styles.currencyName}>zł PLN</span>
              </div>
            </div>

            <div 
              className={`${styles.currencyCard} ${currency === 'CNY' ? styles.active : ''}`}
              onClick={() => setCurrency('CNY')}
            >
              <div className={styles.flag}><img src="/images/flag-cn.png" alt="CN" className={styles.flagImg} /></div>
              <div className={styles.currencyInfo}>
                <span className={styles.currencyName}>¥ CNY</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('settings.agent')}</h3>
          <div className={styles.dropdownContainer}>
            <div 
              className={styles.dropdownTrigger}
              onClick={() => {
                setIsAgentDropdownOpen(!isAgentDropdownOpen);
                setIsLangDropdownOpen(false);
              }}
            >
              <div className={styles.agentInfo}>
                {agents.find(a => a.name === agent)?.image ? (
                  <img src={agents.find(a => a.name === agent).image} alt={agent} className={styles.agentImg} />
                ) : (
                  <FontAwesomeIcon icon={faCircle} style={{ color: agents.find(a => a.name === agent)?.color }} className={styles.agentIcon} />
                )}
                <span>{agent}</span>
              </div>
              <FontAwesomeIcon icon={faChevronDown} className={styles.chevron} />
            </div>

            {isAgentDropdownOpen && (
              <div className={styles.dropdownMenu}>
                {agents.map(a => (
                  <div 
                    key={a.name}
                    className={`${styles.dropdownItem} ${agent === a.name ? styles.activeItem : ''}`}
                    onClick={() => {
                      setAgent(a.name);
                      setIsAgentDropdownOpen(false);
                    }}
                  >
                    {a.image ? (
                      <img src={a.image} alt={a.name} className={styles.agentImg} />
                    ) : (
                      <FontAwesomeIcon icon={faCircle} style={{ color: a.color }} className={styles.agentIcon} />
                    )}
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.saveBtn} onClick={handleSave}>
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
