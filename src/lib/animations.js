// src/lib/animations.js
export function typeText() {
  const phrases = ['Join the best rep community!', 'Find your favorite products!', 'Learn with us!'];
  let phraseIndex = 0;
  let letterIndex = 0;
  let currentPhrase = '';
  const typedText = document.getElementById('typed-text');

  if (!typedText) return;

  function type() {
    if (letterIndex < phrases[phraseIndex].length) {
      currentPhrase += phrases[phraseIndex].charAt(letterIndex);
      typedText.textContent = currentPhrase;
      letterIndex++;
      setTimeout(type, 100);
    } else {
      setTimeout(erase, 2000);
    }
  }

  function erase() {
    if (letterIndex > 0) {
      currentPhrase = currentPhrase.slice(0, -1);
      typedText.textContent = currentPhrase;
      letterIndex--;
      setTimeout(erase, 50);
    } else {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setTimeout(type, 500);
    }
  }

  type();
}

export function useShowModal() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowModal(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return [showModal, setShowModal];
}