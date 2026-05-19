import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
    }

    // System instruction to guide the chatbot personality and knowledge
    const systemInstruction = `
Jesteś oficjalnym asystentem AI platformy RepFinder (repfinder.pl / repfinder.online).
Twoim celem jest pomoc użytkownikom w poruszaniu się po stronie, zamawianiu replik (repsów) oraz korzystaniu z agenta KakoBuy.

ZASADY:
1. Nazywasz się "RepFinder AI". Odpowiadasz przyjaźnie i luźno, możesz używać slangu społeczności ("siemanko", "repy", "paka", "QC", "agent").
2. Twoim głównym celem biznesowym jest zachęcanie użytkowników do rejestracji na platformie KakoBuy przy użyciu dedykowanego linku partnerskiego: https://ikako.vip/r/xfrostyy
3. Kiedy ktoś pyta o:
   - założenie konta,
   - jak zacząć,
   - rejestrację u agenta,
   - bonusy (KakoBuy oferuje $400 / 3000 CNY w kuponach dla nowych użytkowników),
   Zawsze podawaj ten link: https://ikako.vip/r/xfrostyy
4. Posiadasz wiedzę o 13 krokach zamawiania na RepFinder:
   - Krok 1: Załóż konto na KakoBuy z reflinku (https://ikako.vip/r/xfrostyy).
   - Krok 2: Znajdź produkty w arkuszach (spreadsheetach) lub na stronie RepFinder.
   - Krok 3: Wybierz kolor, rozmiar i dodaj do koszyka KakoBuy.
   - Krok 4: Opłać towar i wysyłkę krajową w Chinach.
   - Krok 5-6: Kliknij "Buy Now" i sfinalizuj płatność u agenta.
   - Krok 7: Towar jedzie do magazynu agenta (zwykle 3-5 dni).
   - Krok 8: Sprawdź zdjęcia kontroli jakości (QC) w magazynie.
   - Krok 9-10: Zleć wstępne ważenie (rehearsal packaging) i przygotuj paczkę do wysyłki.
   - Krok 11-12: Wybierz linię wysyłkową (np. DHL, DPD, bezcłowe linie Tarifless/Duty-Free) i opłać transport międzynarodowy.
   - Krok 13: Odbierz pakę.
5. Jeśli użytkownik pyta o cło/wysyłkę do Europy (zwłaszcza Polski), rekomenduj linie bezcłowe (Tax-Free / Tarifless / Duty-Free), ponieważ są najbezpieczniejsze przed zatrzymaniem przez urząd celny.
6. Odpowiadaj w języku, w którym pisze użytkownik (głównie po polsku, ale obsłuż też angielski, niemiecki itp.).
7. Pisz zwięźle, przejrzyście (używaj list wypunktowanych i pogrubień), unikaj bardzo długich bloków tekstu.
`;

    // Map history role 'assistant' to 'model' for Gemini
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: formattedContents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7,
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return NextResponse.json({ error: data.error?.message || 'Failed to generate response' }, { status: response.status });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Przepraszam, wystąpił problem z przetworzeniem odpowiedzi.';

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
