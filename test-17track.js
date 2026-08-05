const trackingCode = 'CP146244378DE';

async function translateStatus(record) {
    // Uproszczona wersja do testów
    return record;
}

async function fetchFrom17TrackScraper(trackingCode) {
    try {
        const payload = {
            data: [{
                num: trackingCode
            }],
            guid: "",
            time: Date.now()
        };

        const response = await fetch('https://www.17track.net/restapi/track/gettrackcombined', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://www.17track.net',
                'Referer': 'https://www.17track.net/pl',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data.code !== 0 || !data.data || data.data.length === 0) return null;

        const result = data.data[0];
        const track = result.track;

        if (!track || (!track.z1 && !track.z2)) return null;

        const events = [...(track.z1 || []), ...(track.z2 || [])].sort((a, b) => new Date(b.a) - new Date(a.a));

        if (events.length === 0) return null;

        const trackingInfo = events.map(item => ({
            Data: item.a || '',
            Lokalizacja: item.c || item.d || '',
            Status: item.z || ''
        }));

        return { trackingInfo, source_api: '17track Scraper' };
    } catch (error) {
        console.error('17track Scraper Error:', error.message);
        return null;
    }
}

async function test() {
    console.log(`Testing code: ${trackingCode}...`);
    const data = await fetchFrom17TrackScraper(trackingCode);
    if (data) {
        console.log('SUCCESS!');
        console.log('Source:', data.source_api);
        console.log('Latest Status:', data.trackingInfo[0].Status);
        console.log('Total Events:', data.trackingInfo.length);
    } else {
        console.log('FAILED to find data.');
    }
}

test();
