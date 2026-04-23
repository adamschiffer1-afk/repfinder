// ========================================================
        // LOGIKA TRACKERA PACZEK
        // ========================================================
        window.openTracking = function(provider) {
            const input = document.getElementById("trackingInputVal");
            if (!input) {
                alert("Błąd: Nie znaleziono pola tekstowego.");
                return;
            }
            const trackNum = input.value.trim();
            if (!trackNum) {
                alert("Proszę wpisać numer przesyłki przed wyborem kuriera!");
                return;
            }
            let url = '';
            if (provider === '17track') {
                url = 'https://t.17track.net/en#nums=' + encodeURIComponent(trackNum);
            } else if (provider === 'dhl') {
                url = 'https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=' + encodeURIComponent(trackNum);
            } else if (provider === 'aftership') {
                url = 'https://www.aftership.com/track/' + encodeURIComponent(trackNum);
            }
            if (url) {
                window.open(url, '_blank');
            }
        };