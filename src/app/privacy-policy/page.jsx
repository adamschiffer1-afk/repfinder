export const metadata = {
  title: 'Polityka Prywatności | RepFinder',
  description: 'Polityka prywatności serwisu RepFinder.xyz',
};

export default function PrivacyPolicy() {
  return (
    <div style={{
      maxWidth: '760px',
      margin: '0 auto',
      padding: '80px 24px',
      color: 'rgba(255,255,255,0.8)',
      fontFamily: 'inherit',
      lineHeight: '1.75',
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', marginBottom: '8px', letterSpacing: '-1px' }}>
        Polityka prywatności
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '48px' }}>
        Ostatnia aktualizacja: październik 2026
      </p>

      <Section title="1. Informacje ogólne">
        Serwis RepFinder.xyz (dalej: „Serwis") szanuje prywatność swoich użytkowników.
        Niniejsza polityka prywatności opisuje, jakie dane zbieramy, w jaki sposób je
        wykorzystujemy i jak je chronimy.
      </Section>

      <Section title="2. Administrator danych">
        Administratorem danych osobowych jest właściciel serwisu RepFinder.xyz.
        W sprawach dotyczących danych osobowych możesz skontaktować się przez serwer Discord
        podlinkowany w stopce serwisu.
      </Section>

      <Section title="3. Dane zbierane automatycznie">
        Podczas korzystania z Serwisu możemy automatycznie zbierać:
        <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>adres IP oraz dane przeglądarki (user-agent)</li>
          <li>dane nawigacyjne (odwiedzone podstrony, czas wizyty)</li>
          <li>dane zapisywane przez mechanizm cookies (np. preferencje waluty i języka)</li>
        </ul>
      </Section>

      <Section title="4. Logowanie przez Discord">
        Serwis umożliwia opcjonalne logowanie przez OAuth2 Discord. Przy logowaniu pobieramy:
        <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>unikalny identyfikator konta Discord (ID)</li>
          <li>nazwę użytkownika i awatar</li>
          <li>adres e-mail (jeśli Discord go udostępnia)</li>
        </ul>
        Dane te są wykorzystywane wyłącznie do identyfikacji sesji i nie są sprzedawane ani
        przekazywane podmiotom trzecim.
      </Section>

      <Section title="5. Cookies">
        Serwis używa plików cookie wyłącznie do celów funkcjonalnych (zapamiętanie wybranej
        waluty i języka). Nie wykorzystujemy ciasteczek do śledzenia ani reklam. Możesz
        wyłączyć obsługę cookies w ustawieniach przeglądarki — część funkcji Serwisu może
        wtedy nie działać poprawnie.
      </Section>

      <Section title="6. Prawa użytkownika">
        Masz prawo do:
        <ul style={{ marginTop: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>dostępu do swoich danych osobowych</li>
          <li>sprostowania lub usunięcia danych</li>
          <li>ograniczenia przetwarzania</li>
          <li>przenoszenia danych</li>
          <li>wniesienia skargi do organu nadzorczego (UODO)</li>
        </ul>
      </Section>

      <Section title="7. Bezpieczeństwo">
        Stosujemy odpowiednie środki techniczne i organizacyjne w celu ochrony danych przed
        nieuprawnionym dostępem, utratą lub zniszczeniem. Dane przechowywane są na
        zabezpieczonych serwerach (Supabase / Vercel).
      </Section>

      <Section title="8. Zmiany polityki">
        Zastrzegamy sobie prawo do zmiany niniejszej polityki prywatności. O istotnych
        zmianach będziemy informować na serwerze Discord. Korzystanie z Serwisu po
        wprowadzeniu zmian oznacza ich akceptację.
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <h2 style={{
        fontSize: '17px',
        fontWeight: 700,
        color: '#fff',
        marginBottom: '12px',
        letterSpacing: '-0.3px',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>
        {children}
      </div>
    </div>
  );
}
