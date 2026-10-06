'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faCog, faBars, faTimes, faLink, faTruck, faCamera, faCalculator } from '@fortawesome/free-solid-svg-icons';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import SettingsModal from '@/components/SettingsModal';
import styles from '@/styles/Navbar.module.css';

const TOOLS = [
  { href: '/link-converter', label: 'Link Converter',    icon: faLink },
  { href: '/tracking',       label: 'Tracking',          icon: faTruck },
  { href: '/qc',             label: 'Quality Check',     icon: faCamera },
];

const LANGUAGES = [
  { code: 'pl', flag: '/images/flag-pl.png',   label: 'Polski' },
  { code: 'en', flag: '/images/flag-us.png',   label: 'English' },
  { code: 'cn', flag: '/images/flag-cn.png',   label: '中文' },
  { code: 'de', flag: '/images/niemcy.png',    label: 'Deutsch' },
  { code: 'es', flag: '/images/hiszpania.png', label: 'Español' },
];

export default function Navbar() {
  const { language, changeLanguage, t } = useLanguage();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [scrolled,      setScrolled]      = useState(false);
  const [visible,       setVisible]       = useState(true);
  const [lastY,         setLastY]         = useState(0);
  const [toolsOpen,     setToolsOpen]     = useState(false);
  const [langOpen,      setLangOpen]      = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [isInitial,     setIsInitial]     = useState(false);

  // Hide on admin
  if (pathname?.startsWith('/admin-99x-hsd')) return null;

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 10);
      setVisible(y < lastY || y < 60);
      setLastY(y);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lastY]);

  useEffect(() => {
    if (!localStorage.getItem('hasSeenSettings')) {
      setIsInitial(true);
      setSettingsOpen(true);
      localStorage.setItem('hasSeenSettings', 'true');
    }
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];

  const NAV_ITEMS = [
    { href: '/',          label: t('navbar.home') },
    { href: '/products',  label: t('navbar.products') },
    { href: '/tutorials', label: t('navbar.tutorials') },
  ];

  return (
    <>
      <nav
        className={[
          styles.navbar,
          scrolled   ? styles.navbarScrolled : '',
          !visible   ? styles.navbarHidden   : '',
        ].join(' ')}
      >
        <div className={styles.navContainer}>

          {/* ── BRAND ── */}
          <div className={styles.navLeft}>
            <Link href="/" className={styles.brand}>
              <img
                src="/images/nowelogo.png"
                alt="RepFinder"
                className={styles.navLogo}
              />
              <span className={styles.brandName}>RepFinder</span>
            </Link>
          </div>

          {/* ── CENTER LINKS ── */}
          <nav className={styles.navCenter}>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
              >
                {item.label}
              </Link>
            ))}

            {/* tools dropdown */}
            <div
              className={styles.dropdownWrapper}
              onMouseEnter={() => setToolsOpen(true)}
              onMouseLeave={() => setToolsOpen(false)}
            >
              <button className={`${styles.navLink} ${styles.dropdownToggle}`}>
                {t('navbar.tools')}
                <FontAwesomeIcon icon={faChevronDown} className={styles.dropIcon} />
              </button>

              {toolsOpen && (
                <div className={styles.toolsDropdown}>
                  {TOOLS.map(tool => (
                    <Link key={tool.href} href={tool.href} className={styles.toolsLink}>
                      <FontAwesomeIcon icon={tool.icon} className={styles.toolIcon} />
                      {tool.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* ── RIGHT ACTIONS ── */}
          <div className={styles.navRight}>

            {/* language */}
            <div
              className={styles.langWrapper}
              onMouseEnter={() => setLangOpen(true)}
              onMouseLeave={() => setLangOpen(false)}
            >
              <button className={styles.langBtn} aria-label="Language">
                <img src={currentLang.flag} alt={currentLang.label} className={styles.navFlag} />
                <FontAwesomeIcon icon={faChevronDown} className={styles.langChevron} />
              </button>

              {langOpen && (
                <div className={styles.langDropdown}>
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      className={`${styles.langOption} ${language === lang.code ? styles.langActive : ''}`}
                      onClick={() => { changeLanguage(lang.code); setLangOpen(false); }}
                    >
                      <img src={lang.flag} alt={lang.label} className={styles.optionFlag} />
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* settings */}
            <button
              className={styles.settingsBtn}
              onClick={() => { setIsInitial(false); setSettingsOpen(true); }}
              aria-label="Settings"
            >
              <FontAwesomeIcon icon={faCog} className={styles.settingsIcon} />
            </button>

            {/* hamburger */}
            <button
              className={styles.hamburgerBtn}
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Menu"
            >
              <FontAwesomeIcon icon={mobileOpen ? faTimes : faBars} className={styles.hamburgerIcon} />
            </button>
          </div>
        </div>

        {/* ── MOBILE MENU ── */}
        {mobileOpen && (
          <div className={styles.mobileMenu}>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.mobileNavLink} ${pathname === item.href ? styles.active : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <div className={styles.mobileToolsSection}>
              <p className={styles.mobileToolsTitle}>{t('navbar.tools')}</p>
              <div className={styles.mobileToolsList}>
                {TOOLS.map(tool => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className={styles.mobileNavLink}
                    onClick={() => setMobileOpen(false)}
                  >
                    {tool.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className={styles.mobileLangSection}>
              <p className={styles.mobileToolsTitle}>Język</p>
              <div className={styles.mobileLangGrid}>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    className={`${styles.mobileLangBtn} ${language === lang.code ? styles.mobileLangActive : ''}`}
                    onClick={() => { changeLanguage(lang.code); setMobileOpen(false); }}
                  >
                    <img src={lang.flag} alt={lang.label} className={styles.mobileFlag} />
                    {lang.code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isInitial={isInitial}
      />
    </>
  );
}
