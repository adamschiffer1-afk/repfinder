import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';

// Cache configuration (TTL: 1 hour)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Lista serwerów TrackIndex (Legacy IP Servers)
const apiUrls = [
    'http://120.24.176.176:8082/en/trackIndex.htm',
    'http://111.230.211.49:8082/trackIndex.htm',
    'http://111.230.15.119:8082/trackIndex.htm',
    'http://120.77.221.225:8082/trackIndex.htm',
    'http://49.234.188.236:8082/trackIndex.htm',
    'http://115.29.184.71:8082/trackIndex.htm',
    'http://120.78.2.65:8082/en/trackIndex.htm',
    'http://114.132.51.252:8082/trackIndex.htm'
];

// ─── Pobieranie z API 17TRACK ──────────────────────────────────────────────────
async function fetchFrom17TrackOfficial(trackingCode, carrierCode = 0) {
    const apiKey = process.env.TRACKING_API_KEY || '0E2E9E53F97E28275E85CBBD16C2DD29';
    try {
        // Rejestracja numeru w tle
        await fetch('https://api.17track.net/track/v2.4/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', '17token': apiKey },
            body: JSON.stringify([{ number: trackingCode, carrier: carrierCode }]),
            signal: AbortSignal.timeout(5000)
        }).catch(() => {});

        // Pobranie danych
        const response = await fetch('https://api.17track.net/track/v2.4/getTrackInfo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', '17token': apiKey },
            body: JSON.stringify([{ number: trackingCode }]),
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) return null;

        const result = await response.json();
        if (result.code !== 0 || !result.data?.accepted?.length) return null;

        const data = result.data.accepted[0];
        const trackInfoRaw = data.track_info;
        
        if (!trackInfoRaw?.tracking?.providers) return null;

        const allEvents = [];
        trackInfoRaw.tracking.providers.forEach(p => {
            if (p.events) allEvents.push(...p.events);
        });

        if (!allEvents.length) return null;

        const trackingInfo = allEvents
            .sort((a, b) => new Date(b.time_iso || b.time_utc) - new Date(a.time_iso || a.time_utc))
            .map(item => ({
                Data: item.time_iso || item.time_utc || '',
                Lokalizacja: item.location || '',
                Status: item.description || ''
            }));

        return {
            mainInfo: {
                'Numer referencyjny': trackingCode,
                'Numer śledzenia': data.number,
                'Kraj': trackInfoRaw.shipping_info?.recipient_address?.country || 'Polska',
                'Data': trackingInfo[0]?.Data || '',
                'Ostatni status': trackInfoRaw.latest_status?.status || trackingInfo[0]?.Status || '',
                'Odbiorca': ''
            },
            trackingInfo,
            source_api: '17TRACK Official API'
        };
    } catch (error) {
        return null;
    }
}

// ─── Pobieranie z Cainiao ─────────────────────────────────────────────────────
async function fetchFromCainiao(trackingCode) {
    try {
        const response = await fetch(`https://global.cainiao.com/global/detail.json?mailNos=${trackingCode}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(7000)
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data.success || !data.module?.length) return null;

        const result = data.module[0];
        if (!result.detailList?.length) return null;

        const trackingInfo = result.detailList.map(item => ({
            Data: item.timeStr || item.time || '',
            Lokalizacja: item.standdprdAddress || '',
            Status: item.desc || item.statusDesc || ''
        }));

        return {
            mainInfo: {
                'Numer referencyjny': trackingCode,
                'Numer śledzenia': result.mailNo,
                'Kraj': result.destCountry || 'Polska',
                'Data': trackingInfo[0]?.Data || '',
                'Ostatni status': result.statusDesc || trackingInfo[0]?.Status || '',
                'Odbiorca': ''
            },
            trackingInfo,
            source_api: 'Cainiao Global'
        };
    } catch (error) {
        return null;
    }
}

// ─── Pobieranie z ParcelsApp ──────────────────────────────────────────────────
async function fetchFromParcelsApp(trackingCode) {
    try {
        const response = await fetch(`https://parcelsapp.com/api/v2/parcels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({ trackingId: trackingCode, language: 'en', country: 'Poland' }),
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data?.states?.length) return null;

        const trackingInfo = data.states.map(item => ({
            Data: item.date || '',
            Lokalizacja: item.location || '',
            Status: item.status || ''
        }));

        return {
            mainInfo: {
                'Numer referencyjny': trackingCode,
                'Numer śledzenia': data.trackingId || trackingCode,
                'Kraj': data.destination || 'Polska',
                'Data': trackingInfo[0]?.Data || '',
                'Ostatni status': data.status || trackingInfo[0]?.Status || '',
                'Odbiorca': ''
            },
            trackingInfo,
            source_api: 'ParcelsApp'
        };
    } catch (error) {
        return null;
    }
}

// ─── Pobieranie z serwera IP (skraper) ────────────────────────────────────────
async function fetchFromApi(apiUrl, trackingCode) {
    try {
        const requestData = new URLSearchParams();
        requestData.append('documentCode', trackingCode);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: requestData,
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) return null;

        const responseBody = await response.text();
        const $ = cheerio.load(responseBody, { decodeEntities: false });
        const trackingInfo = [];

        $('table tr:has(td:nth-child(1):not(:empty))').each((index, element) => {
            const date = $(element).find('td:nth-child(1)').text().trim();
            const location = $(element).find('td:nth-child(2)').text().trim();
            const record = $(element).find('td:nth-child(3)').text().trim();

            if (date && record) {
                trackingInfo.push({ Data: date, Lokalizacja: location, Status: record });
            }
        });

        const mainInfo = {};
        $('.menu_ ul:nth-child(2) li').each((index, element) => {
            const text = $(element).text().trim();
            if (index === 0) mainInfo['Numer referencyjny'] = text;
            if (index === 1) mainInfo['Numer śledzenia'] = text;
            if (index === 2) mainInfo['Kraj'] = text;
            if (index === 3) mainInfo['Data'] = text;
            if (index === 4) mainInfo['Ostatni status'] = text.split('/')[0].trim();
            if (index === 5) mainInfo['Odbiorca'] = text;
        });

        return trackingInfo.length > 0 ? { mainInfo, trackingInfo, source_api: apiUrl } : null;
    } catch (error) {
        return null;
    }
}

// ─── Szybki wyścig serwerów IP (Promise.any) ─────────────────────────────────
async function fastIpServersRace(trackingCode) {
    // Odpalamy zapytania do wszystkich serwerów IP
    const promises = apiUrls.map(url => 
        fetchFromApi(url, trackingCode).then(result => {
            // Promise.any akceptuje pierwszy RESOLVED promise. 
            // Jeśli wynik to null, rzucamy błąd, aby Promise.any go zignorował
            if (!result) throw new Error('No data');
            return result;
        })
    );

    try {
        // Zwraca dane pierwszego serwera, który odpisze prawidłowymi danymi
        return await Promise.any(promises);
    } catch (e) {
        // Wszystkie serwery zawiodły (lub timeout)
        return null;
    }
}

// ─── Główny Endpoint API ──────────────────────────────────────────────────────
export async function GET(request, { params }) {
    const { code } = await params;
    if (!code) return NextResponse.json({ error: 'Tracking number required' }, { status: 400 });

    try {
        const trimmedCode = code.trim().toUpperCase();
        
        // Inteligentny klucz cache (czyste dane)
        const cacheKey = `tracking_raw_${trimmedCode}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return NextResponse.json({
                success: true,
                ...cachedData
            }, { status: 200, headers: { 'Cache-Control': 'no-store' }});
        }

        const isDePackage = trimmedCode.endsWith('DE') && /^[A-Z]{2}\d+[A-Z]{2}$/.test(trimmedCode);
        let data = null;

        if (isDePackage) {
            data = await fetchFrom17TrackOfficial(trimmedCode, 190416); // 190416 = HSD Express
        } else {
            // Najpierw 17track z autodetekcją (0), najpewniejsze i najszybsze źródło
            data = await fetchFrom17TrackOfficial(trimmedCode, 0);
        }

        // Fallbacki jeśli 17track nic nie znajdzie lub rzuci błędem
        if (!data) data = await fetchFromCainiao(trimmedCode);
        if (!data) data = await fastIpServersRace(trimmedCode);
        if (!data) data = await fetchFromParcelsApp(trimmedCode);

        if (data && data.trackingInfo.length > 0) {
            const finalPayload = {
                Informacje_główne: data.mainInfo,
                Szczegóły_przesyłki: data.trackingInfo,
                Źródło: data.source_api
            };
            
            cache.set(cacheKey, finalPayload);
            
            return NextResponse.json({
                success: true,
                ...finalPayload
            }, { status: 200, headers: { 'Cache-Control': 'no-store' }});
        }

        return NextResponse.json({ success: false, message: 'Tracking not found' }, { status: 404 });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
