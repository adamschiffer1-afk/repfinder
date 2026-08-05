const trackingCode = 'CP146244378DE';
const apiKey = '0E2E9E53F97E28275E85CBBD16C2DD29';
const carriers = [0, 190416, 190342, 190000, 100000];

async function testCarrier(carrierCode) {
    try {
        await fetch('https://api.17track.net/track/v2.4/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', '17token': apiKey },
            body: JSON.stringify([{ number: trackingCode, carrier: carrierCode }])
        });

        const response = await fetch('https://api.17track.net/track/v2.4/getTrackInfo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', '17token': apiKey },
            body: JSON.stringify([{ number: trackingCode }])
        });
        
        const result = await response.json();
        
        if (result.code !== 0 || !result.data?.accepted?.length) {
            console.log(`Carrier ${carrierCode}: failed or no data`);
            return;
        }

        const data = result.data.accepted[0];
        const providers = data.track_info?.tracking?.providers || [];
        let eventCount = 0;
        providers.forEach(p => {
            if (p.events) eventCount += p.events.length;
        });

        console.log(`Carrier ${carrierCode}: found ${eventCount} events. Provider ID: ${providers.map(p => p.provider.key).join(',')}`);
        if (eventCount > 0) {
             const allEvents = [];
             providers.forEach(p => {
                 if (p.events) allEvents.push(...p.events);
             });
             console.log(allEvents.map(e => e.time_iso + ' - ' + e.description).slice(0, 5));
        }
    } catch (e) {
        console.error(`Error with carrier ${carrierCode}:`, e.message);
    }
}

async function main() {
    for (const c of carriers) {
        await testCarrier(c);
    }
}
main();
