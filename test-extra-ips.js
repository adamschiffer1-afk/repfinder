const cheerio = require('cheerio');
const apiUrls = [
    'http://111.231.71.230:8082/trackIndex.htm',
    'http://39.101.71.24:8082/en/trackIndex.htm',
    'http://106.55.5.75:8082/en/trackIndex.htm'
];

async function testAll() {
    console.log('Testing CP146244378DE on extra IPs...');
    for (const url of apiUrls) {
        try {
            const requestData = new URLSearchParams();
            requestData.append('documentCode', 'CP146244378DE');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: requestData,
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                console.log(url, 'FAILED HTTP', response.status);
                continue;
            }

            const html = await response.text();
            const $ = cheerio.load(html);
            const rows = $('table tr:has(td:nth-child(1):not(:empty))').length;
            console.log(url, 'SUCCESS, rows:', rows);
        } catch (e) {
            console.log(url, 'ERROR:', e.message);
        }
    }
}
testAll();
