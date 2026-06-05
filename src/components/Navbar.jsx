'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faCog, faExternalLinkAlt, faBars, faTimes, faSignOutAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import styles from '@/styles/Navbar.module.css';
import SettingsModal from '@/components/SettingsModal';
import { useSession, signIn, signOut } from 'next-auth/react';

import { useLanguage } from '@/context/LanguageContext';

export default function Navbar() {
  const { language, changeLanguage, t } = useLanguage();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  if (pathname?.startsWith('/admin-99x-hsd')) return null;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInitial, setIsInitial] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      
      setScrolled(currentScrollY > 20);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Auto-open settings on first visit
    const hasSeen = localStorage.getItem('hasSeenSettings');
    if (!hasSeen) {
      setIsInitial(true);
      setIsSettingsOpen(true);
      localStorage.setItem('hasSeenSettings', 'true');
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems = [
    { href: '/', label: t('navbar.home') },
    { href: '/products', label: t('navbar.products') },
    { href: '/tutorials', label: t('navbar.tutorials') },
  ];

  const languages = [
    { code: 'pl', flag: '/images/flag-pl.png', label: 'Polski' },
    { code: 'en', flag: '/images/flag-us.png', label: 'English' },
    { code: 'cn', flag: '/images/flag-cn.png', label: '中文' },
    { code: 'de', flag: '/images/niemcy.png', label: 'Deutsch' },
    { code: 'es', flag: '/images/hiszpania.png', label: 'Español' },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  const handleLogin = () => {
    signIn('discord', { callbackUrl: '/' });
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  const isAdmin = session?.user?.isAdmin === true;
  const userRole = isAdmin ? 'Administrator' : 'Użytkownik';

  return (
    <>
      <nav className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''} ${!visible ? styles.navbarHidden : ''}`}>
        <div className={styles.navContainer}>
          <div className={styles.navLeft}>
            <Link href="/" className={styles.brand}>
              <img src="/images/rf-logo-removebg-preview.png" alt="RF" className={styles.navLogo} />
              RepFinder
            </Link>
          </div>

          <div className={styles.navCenter}>
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
              >
                {item.label}
              </Link>
            ))}
            
            <div 
              className={styles.dropdownWrapper}
              onMouseEnter={() => setIsToolsOpen(true)}
              onMouseLeave={() => setIsToolsOpen(false)}
            >
              <button className={`${styles.navLink} ${styles.dropdownToggle}`}>
                {t('navbar.tools')} <FontAwesomeIcon icon={faChevronDown} className={styles.dropIcon} />
              </button>
              
              {isToolsOpen && (
                <div className={styles.toolsDropdown}>
                  <Link href="/link-converter" className={styles.toolsLink}>Link Converter</Link>
                  <Link href="/tracking" className={styles.toolsLink}>Tracking</Link>
                  <Link href="/qc" className={styles.toolsLink}>{t('navbar.qualityCheck')}</Link>
                  <Link href="/calculator" className={styles.toolsLink}>{t('navbar.calculator')}</Link>
                </div>
              )}
            </div>
          </div>

          <div className={styles.navRight}>
            {/* User Menu / Login */}
            {status === 'loading' ? (
              <div className={styles.userLoading}>...</div>
            ) : session?.user ? (
              <div 
                className={styles.userMenuWrapper}
                onMouseEnter={() => setIsUserMenuOpen(true)}
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <button className={styles.userBtn}>
                  {session.user.image ? (
                    <img src={session.user.image} alt={session.user.name} className={styles.userAvatar} />
                  ) : (
                    <div className={styles.userAvatarPlaceholder}>
                      <FontAwesomeIcon icon={faUser} />
                    </div>
                  )}
                  <span className={styles.userName}>{session.user.name || 'User'}</span>
                  <span className={`${styles.userBadge} ${session.user.isAdmin ? styles.adminBadge : styles.regularBadge}`}>
                    {session.user.isAdmin ? 'Administrator' : 'Użytkownik'}
                  </span>
                  <FontAwesomeIcon icon={faChevronDown} className={styles.userChevron} />
                </button>
                
                {isUserMenuOpen && (
                  <div className={styles.userDropdown}>
                    <button 
                      className={styles.userDropdownItem}
                      onClick={() => signOut({ callbackUrl: '/' })}
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} />
                      Wyloguj się
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                className={styles.loginBtn}
                onClick={() => signIn('discord', { callbackUrl: '/' })}
              >
                <FontAwesomeIcon icon={faDiscord} />
                Zaloguj się
              </button>
            )}

            {/* Language Switcher */}
            <div 
              className={styles.langWrapper}
              onMouseEnter={() => setIsLangOpen(true)}
              onMouseLeave={() => setIsLangOpen(false)}
            >
              <button className={styles.langBtn}>
                <img src={currentLang.flag} alt={currentLang.label} className={styles.navFlag} />
                <FontAwesomeIcon icon={faChevronDown} className={styles.langChevron} />
              </button>
              
              {isLangOpen && (
                <div className={styles.langDropdown}>
                  {languages.map((lang) => (
                    <button 
                      key={lang.code} 
                      className={`${styles.langOption} ${language === lang.code ? styles.langActive : ''}`}
                      onClick={() => {
                        changeLanguage(lang.code);
                        setIsLangOpen(false);
                      }}
                    >
                      <img src={lang.flag} alt={lang.label} className={styles.optionFlag} />
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={() => { setIsInitial(false); setIsSettingsOpen(true); }}
              className={styles.settingsBtn}
              aria-label="Settings"
            >
              <FontAwesomeIcon icon={faCog} className={styles.settingsIcon} />
            </button>
            <button 
              className={styles.hamburgerBtn}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} className={styles.hamburgerIcon} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className={styles.mobileMenu}>
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={`${styles.mobileNavLink} ${pathname === item.href ? styles.active : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            
            <div className={styles.mobileToolsSection}>
              <div className={styles.mobileToolsTitle}>{t('navbar.tools')}</div>
              <div className={styles.mobileToolsList}>
                <Link href="/link-converter" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>Link Converter</Link>
                <Link href="/tracking" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>Tracking</Link>
                <Link href="/qc" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>{t('navbar.qualityCheck')}</Link>
                <Link href="/calculator" className={styles.mobileNavLink} onClick={() => setIsMobileMenuOpen(false)}>{t('navbar.calculator')}</Link>
              </div>
            </div>

            {/* Mobile Language Switcher */}
            <div className={styles.mobileLangSection}>
              <div className={styles.mobileToolsTitle}>Language</div>
              <div className={styles.mobileLangGrid}>
                {languages.map((lang) => (
                  <button 
                    key={lang.code} 
                    className={`${styles.mobileLangBtn} ${language === lang.code ? styles.mobileLangActive : ''}`}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setIsMobileMenuOpen(false);
                    }}
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
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        isInitial={isInitial}
      />
    </>
  );
}