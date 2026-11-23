import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';

// Cache configuration (TTL: 1 hour)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Lista serwerów TrackIndex (tylko nowy serwer)
const apiUrls = [
    'http://111.231.71.230:8082/trackIndex.htm'
];

// ─── Funkcja tłumaczenia statusów ─────────────────────────────────────────────
function translateStatus(record, date = '') {
    const statusTranslations = {
        'The shipment has been successfully delivered': 'Przesyłka została pomyślnie dostarczona',
        'The shipment has been successfully delivereddelivered': 'Przesyłka została pomyślnie dostarczona',
        'The shipment has been loaded onto the delivery vehicle': 'Przesyłka została załadowana na pojazd dostawczy',
        'The shipment has been loaded onto the delivery vehiclepickup': 'Przesyłka została załadowana na pojazd dostawczy',
        'The shipment is being prepared for delivery in the delivery depot': 'Przesyłka jest przygotowywana do doręczenia w magazynie dostaw',
        'The shipment is being prepared for delivery in the delivery depotpickup': 'Przesyłka jest przygotowywana do doręczenia w magazynie dostaw',
        'The shipment has been processed in the parcel center': 'Przesyłka została przetworzona w centrum dystrybucyjnym',
        'The shipment has been processed in the parcel centertransit': 'Przesyłka została przetworzona w centrum dystrybucyjnym',
        'The shipment has arrived in the destination country/destination area': 'Przesyłka dotarła do kraju docelowego',
        'The shipment arrived in the region of recipient and will be transported to the delivery base in the next step': 'Przesyłka dotarła do regionu odbiorcy i zostanie przetransportowana do bazy dostaw w następnym kroku',
        'The shipment arrived in the region of recipient and will be transported to the delivery base in the next step.transit': 'Przesyłka dotarła do regionu odbiorcy i zostanie przetransportowana do bazy dostaw w następnym kroku',
        'The international shipment has been processed in the export parcel center': 'Przesyłka międzynarodowa została przetworzona w centrum eksportu',
        'The international shipment has been processed in the export parcel centertransit': 'Przesyłka międzynarodowa została przetworzona w centrum eksportu',
        'The international shipment has been processed in the parcel center of origin': 'Przesyłka międzynarodowa została przetworzona w centrum nadania',
        'The international shipment has been processed in the parcel center of origintransit': 'Przesyłka międzynarodowa została przetworzona w centrum nadania',
        'The shipment has been processed in the destination parcel center': 'Przesyłka została przetworzona w docelowym centrum obsługi paczek',
        'Loaded to movement / tour vehicle': 'Załadowany do pojazdu transportowego',
        'Movement / tour vehicle arrived': 'Przybył pojazd transportowy',
        'Unloaded from movement / tour vehicle': 'Rozładunek z pojazdu transportowego',
        'Pick-up was successful.': 'Odbiór przebiegł pomyślnie',
        'Shipment information received': 'Otrzymane informacje o przesyłce',
        'Delivered successfully': 'Dostarczone pomyślnie',
        'Your parcel has been delivered successfully': 'Twoja paczka została pomyślnie dostarczona',
        'Your parcel is out for delivery': 'Twoja paczka jest w drodze do dostawy',
        'Out for delivery': 'W drodze do dostawy', 
        'At parcel delivery centre': 'W centrum dostaw',
        'In transit': 'W tranzycie',
        'Your parcel is on its way': 'Twoja paczka jest w drodze',
        'Your parcel is ready to leave our hub': 'Twoja paczka jest gotowa do opuszczenia naszego centrum',
        'Your parcel is ready to be transported to our next premises': 'Twoja paczka jest gotowa do transportu do następnego centrum',
        'Your parcel arrived at our depot': 'Twoja paczka dotarła do naszego magazynu',
        'Your parcel delivery date has changed': 'Data dostawy Twojej paczki została zmieniona',
        'Your parcel is estimated to be delivered on': 'Przewidywana dostawa Twojej paczki',
        'The parcel has left the parcel delivery centre and is on its way to the consignee': 'Paczka opuściła centrum dostaw i jest w drodze do odbiorcy',
        'The parcel is at the parcel dispatch centre': 'Paczka znajduje się w centrum dystrybucyjnym',
        'Odprawa celna zakończona pending scanning': 'Odprawa celna zakończona, oczekuje na skanowanie',
        'Customs clearance completed pending scanning': 'Odprawa celna zakończona, oczekuje na skanowanie',
        'Customs clearance completed, waiting for extraction of Customs clearance pending scanning': 'Odprawa celna zakończona, oczekuje na skanowanie',
        'Item have been cleared': 'Przedmiot został odprawiony',
        'Item start customs clearance': 'Rozpoczęto odprawę celną przedmiotu', 
        'Item arrived at destination': 'Przedmiot dotarł do celu',
        'Item departed from origin': 'Przedmiot opuścił miejsce nadania',
        'Item outbound in sorting center': 'Przedmiot wyszedł z centrum sortowniczego',
        'The goods have been shipped out': 'Towary zostały wysłane',
        'Goods have been received': 'Towary zostały odebrane',
        'Hand over service provider': 'Przekazano dostawcy usług',
        'Leaving the warehouse and shipping to the logistics provider': 'Opuszczenie magazynu i wysyłka do dostawcy logistycznego',
        'Packaging completed': 'Pakowanie zakończone',
        'Forecasted': 'Prognozowane',
        'Leave the scan': 'Skanowanie wyjścia',
        'Receiving Scan': 'Skanowanie odbioru',
        'Export customs clearance completed': 'Eksportowa odprawa celna zakończona',
        'Dismantling the board': 'Rozładunek palet po przylocie',
        'The flight has arrived': 'Lot dotarł',
        'Flight has arrived': 'Lot dotarł',
        '已交仓，等待扫描提取': 'Dostarczone do magazynu, oczekuje na skanowanie i odbiór',
        '清关完成，等待交仓': 'Odprawa celna zakończona, przesyłka oczekuje na przekazanie do magazynu',
        '清关中': 'Przesyłka w trakcie odprawy celnej',
        '已落地，待清关': 'Przesyłka wylądowała, oczekuje na odprawę celną',
        '过港中，航班待定': 'Przesyłka w tranzycie, lot do potwierdzenia',
        'The instruction data for this shipment have been provided by the sender to DHL electronically': 'Dane przesyłki zostały przesłane elektronicznie przez nadawcę do DHL',
        'The instruction data for this shipment have been provided by the sender to DHL electronicallytransit': 'Dane przesyłki zostały przesłane elektronicznie przez nadawcę do DHL',
        'The goods leave the operation center': 'Przesyłka opuściła centrum operacyjne',
        'Arrived at the operating center': 'Przesyłka dotarła do centrum operacyjnego',
        '货物电子信息已经收到': 'Otrzymano elektroniczne informacje o przesyłce',
        '清关完成,等待提取Customs clearance completed pending scanning': 'Odprawa celna zakończona, oczekuje na skanowanie i odbiór',
        '航班已抵达Flight has arrived': 'Lot dotarł',
        '航班已起飞Flight has departed': 'Lot odleciał',
        '航班已起飞': 'Lot odleciał',
        '交货服务商': 'Dostawca usług dostawy',
        '清关完成': 'Odprawa celna zakończona',
        '航班排航中': 'Loty są w trakcie planowania',
        '货物移交航司': 'Przekazanie ładunku przewoźnikowi',
        '货物已出货': 'Przesyłka została wysłana',
        '航班已抵达': 'Lot dotarł',
        '货物已收货': 'Przesyłka została przyjęta',
        'Flight has departed': 'Lot odleciał',
        'Expected flight on July 9st': 'Przewidywany lot 9 lipca',
        '到达【AMS】': 'Przylot do: Amsterdam',
        '出发【上海】': 'Wylot z: Szanghaj',
        '出口清关完毕': 'Zakończono odprawę celną eksportową',
        '包裹到达始发地海关【上海】，等待清关': 'Przesyłka dociera do urzędu celnego w miejscu nadania [Szanghaj] i oczekuje na odprawę celną',
        '快件到达机场': 'Przesyłka dotarła na lotnisko',
        '包裹发出仓库': 'Przesyłka została wysłana z magazynu',
        '货物离开操作中心': 'Przesyłka opuściła centrum operacyjne',
        '到达操作中心': 'Przesyłka dotarła do centrum operacyjnego',
        '已收到发货信息': 'Otrzymano informację o wysyłce',
        '目的国清关完成': 'Odprawa celna w miejscu przeznaczenia zakończona',
        '预计7-9号航班起飞': 'Przewidywany lot 9 lipca',
        '货物电子信息已经收到': 'Otrzymano elektroniczne informacje o przesyłce'
    };

    // Czyszczenie statusu
    let cleanRecord = record
        .replace(/transit$/, '')
        .replace(/pickup$/, '')
        .replace(/\(Homepage.*?\)/, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Zachowaj prefiks 签收 dla statusu dostarczenia
    let prefix = cleanRecord.startsWith('签收') ? '签收' : '';
    cleanRecord = cleanRecord.replace(/^签收/, '').trim();

    const translated = statusTranslations[cleanRecord] || translateByRules(cleanRecord, statusTranslations);
    return `${prefix}${translated}`;
}

// Kody lotnisk i chińskie nazwy miast, które pojawiają się w statusach i lokalizacjach.
const AIRPORTS = {
    AMS: 'Amsterdam', WAW: 'Warszawa', LGG: 'Liège', LEJ: 'Lipsk', FRA: 'Frankfurt', CGN: 'Kolonia',
    BUD: 'Budapeszt', PRG: 'Praga', LHR: 'Londyn', CDG: 'Paryż', PVG: 'Szanghaj', SHA: 'Szanghaj',
    HKG: 'Hongkong', CAN: 'Kanton', SZX: 'Shenzhen', PEK: 'Pekin', NGB: 'Ningbo', HGH: 'Hangzhou',
};
const CN_CITIES = {
    上海: 'Szanghaj', 北京: 'Pekin', 广州: 'Kanton', 深圳: 'Shenzhen', 杭州: 'Hangzhou', 义乌: 'Yiwu',
    东莞: 'Dongguan', 莆田: 'Putian', 泉州: 'Quanzhou', 厦门: 'Xiamen', 福州: 'Fuzhou', 宁波: 'Ningbo',
    苏州: 'Suzhou', 南京: 'Nankin', 天津: 'Tianjin', 青岛: 'Qingdao', 郑州: 'Zhengzhou', 成都: 'Chengdu',
    重庆: 'Chongqing', 武汉: 'Wuhan', 长沙: 'Changsha', 佛山: 'Foshan', 温州: 'Wenzhou', 香港: 'Hongkong',
};
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

function placeName(raw) {
    const p = String(raw || '').trim();
    if (AIRPORTS[p.toUpperCase()]) return AIRPORTS[p.toUpperCase()];
    const city = p.replace(/(市|省|区)$/u, '');
    return CN_CITIES[city] || p;
}

const hasChinese = (s) => /[一-鿿]/.test(s);

// Reguły dla statusów, które zawierają zmienne fragmenty (miasto, lotnisko, data)
// albo mieszają chiński z angielskim.
function translateByRules(s, dict) {
    let m;
    if ((m = s.match(/^(?:抵达|到达)【(.+?)】/))) return `Przylot do: ${placeName(m[1])}`;
    if ((m = s.match(/^(?:启运|出发)【(.+?)】/))) return `Wylot z: ${placeName(m[1])}`;
    if ((m = s.match(/(?:快件|包裹)到达始发地海关【(.+?)】/))) return `Przesyłka dotarła do urzędu celnego w miejscu nadania (${placeName(m[1])}), oczekuje na odprawę`;
    if ((m = s.match(/预计(\d{1,2})-(\d{1,2})号?的?航班/))) return `Przewidywany lot: ${m[2]}.${m[1].padStart(2, '0')}`;
    if ((m = s.match(/Expected flight on (\w+) (\d{1,2})(?:st|nd|rd|th)?/i)) && MONTHS[m[1].toLowerCase()]) {
        return `Przewidywany lot: ${m[2]}.${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}`;
    }

    const zh = [
        [/目的(?:地|国)清关完成/, 'Odprawa celna w kraju docelowym zakończona'],
        [/出口清关完(?:成|毕)/, 'Eksportowa odprawa celna zakończona'],
        [/清关完成.*(?:等待提取|等待扫描)/, 'Odprawa celna zakończona, oczekuje na skanowanie i odbiór'],
        [/快件已出库|包裹发出仓库/, 'Przesyłka wydana z magazynu'],
        [/到达收货点/, 'Przesyłka dotarła do punktu przyjęć'],
        [/拆板/, 'Rozładunek palet po przylocie'],
        [/货物移交航司/, 'Przekazanie przesyłki liniom lotniczym'],
        [/快件到达机场/, 'Przesyłka dotarła na lotnisko'],
        [/货物离开操作中心/, 'Przesyłka opuściła centrum operacyjne'],
        [/到达操作中心/, 'Przesyłka dotarła do centrum operacyjnego'],
        [/航班已起飞/, 'Lot odleciał'],
        [/航班已抵达/, 'Lot dotarł'],
        [/货物电子信息已经收到|已收到发货信息/, 'Otrzymano elektroniczne informacje o przesyłce'],
    ];
    for (const [re, pl] of zh) if (re.test(s)) return pl;

    const en = [
        [/processed in the parcel cent(?:er|re) of origin/i, 'Przesyłka została przetworzona w centrum nadawczym'],
        [/processed in the destination parcel cent(?:er|re)/i, 'Przesyłka została przetworzona w docelowym centrum obsługi paczek'],
        [/processed in the export parcel cent(?:er|re)/i, 'Przesyłka została przetworzona w centrum eksportowym'],
        [/processed in the parcel cent(?:er|re)/i, 'Przesyłka została przetworzona w centrum dystrybucyjnym'],
        [/successfully delivered/i, 'Przesyłka została pomyślnie dostarczona'],
        [/out for delivery|loaded onto the delivery vehicle/i, 'Przesyłka w doręczeniu'],
        [/customs clearance completed/i, 'Odprawa celna zakończona'],
        [/handover to airline/i, 'Przekazanie przesyłki liniom lotniczym'],
        [/flight has departed/i, 'Lot odleciał'],
        [/flight has arrived/i, 'Lot dotarł'],
        [/dismantling the board/i, 'Rozładunek palet po przylocie'],
    ];
    for (const [re, pl] of en) if (re.test(s)) return pl;

    // Chiński z angielskim dopiskiem: spróbuj przetłumaczyć część angielską, a jak się nie da, pokaż ją.
    if (hasChinese(s)) {
        const latin = s.replace(/[一-鿿【】，、：（）]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (latin && /[a-z]{3}/i.test(latin)) return dict[latin] || latin;
    }
    return s;
}

// ─── Funkcja obliczania przewidywanego czasu dostawy ──────────────────────────
function calculateEstimatedDelivery(trackingData) {
    if (!trackingData || !trackingData.length) return null;
    
    const latestEvent = trackingData[0]; // Najnowsze zdarzenie (posortowane)
    const latestStatus = latestEvent.Status.toLowerCase();
    const latestLocation = latestEvent.Lokalizacja.toLowerCase();
    const latestDate = new Date(latestEvent.OriginalDate);
    const now = new Date();
    
    console.log(`[DELIVERY CALC] Latest: ${latestStatus} at ${latestLocation} on ${latestEvent.OriginalDate}`);
    
    // Jeśli już dostarczono
    if (latestStatus.includes('dostarczone') || latestStatus.includes('delivered') || 
        latestStatus.includes('successfully delivered') || latestStatus.includes('签收') || 
        latestStatus.includes('pomyślnie dostarczona') || latestStatus.includes('odbiór przebiegł pomyślnie')) {
        return {
            status: 'delivered',
            message: '✅ Przesyłka została już dostarczona',
            estimatedDate: 'Dostarczono'
        };
    }
    
    // Jeśli "out for delivery" lub załadowana na pojazd dostawczy w Polsce
    if ((latestLocation.includes('polska') || latestLocation.includes('poland') || 
         latestLocation.includes('stalowa wola') || latestLocation.includes('warszawa') ||
         latestLocation.includes('poznan') || latestLocation.includes('dobra')) &&
        (latestStatus.includes('out for delivery') || latestStatus.includes('załadowana') || 
         latestStatus.includes('loaded') || latestStatus.includes('pojazd') || 
         latestStatus.includes('vehicle') || latestStatus.includes('delivery vehicle'))) {
        
        const deliveryDate = new Date(latestDate);
        deliveryDate.setHours(deliveryDate.getHours() + 6); // Dostawa w ciągu 6 godzin
        
        // Jeśli to już jutro, ustaw na jutro rano
        if (deliveryDate.getDate() !== latestDate.getDate()) {
            deliveryDate.setDate(latestDate.getDate() + 1);
            deliveryDate.setHours(10, 0, 0, 0); // 10:00 następnego dnia
        }
        
        return {
            status: 'out_for_delivery',
            estimatedDate: deliveryDate.toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            message: '🚚 W drodze do dostawy - dzisiaj lub jutro rano!'
        };
    }
    
    // Jeśli w centrum dystrybucyjnym w Polsce (parcel center, delivery depot)
    if ((latestLocation.includes('polska') || latestLocation.includes('poland') || 
         latestLocation.includes('stalowa wola') || latestLocation.includes('dobra') ||
         latestLocation.includes('strykow')) &&
        (latestStatus.includes('parcel center') || latestStatus.includes('delivery depot') || 
         latestStatus.includes('centrum') || latestStatus.includes('prepared for delivery') ||
         latestStatus.includes('parcel delivery centre') || latestStatus.includes('at parcel delivery centre'))) {
        
        const deliveryDate = new Date(latestDate);
        deliveryDate.setDate(deliveryDate.getDate() + 1);
        deliveryDate.setHours(14, 0, 0, 0); // Jutro po południu
        
        return {
            status: 'at_delivery_center',
            estimatedDate: deliveryDate.toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            message: '📦 W polskim centrum - dostawa jutro!'
        };
    }
    
    // Jeśli w Polsce ale w tranzycie (ready to be transported, on its way)
    if ((latestLocation.includes('polska') || latestLocation.includes('poland')) &&
        (latestStatus.includes('ready to be transported') || latestStatus.includes('on its way') ||
         latestStatus.includes('in transit') || latestStatus.includes('ready to leave'))) {
        
        const deliveryDate = new Date(latestDate);
        deliveryDate.setDate(deliveryDate.getDate() + 2);
        
        return {
            status: 'poland_transit',
            estimatedDate: deliveryDate.toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            message: '�� Przesyłka w Polsce - dostawa za 1-2 dni'
        };
    }
    
    // Jeśli w Holandii (Vijfhuizen, Oirschot, Veenendaal) - hub europejski
    if (latestLocation.includes('holandia') || latestLocation.includes('netherlands') ||
        latestLocation.includes('vijfhuizen') || latestLocation.includes('oirschot') ||
        latestLocation.includes('veenendaal') || latestLocation.includes('amsterdam')) {
        
        const deliveryDate = new Date(latestDate);
        
        // Jeśli już przeszło odprawę celną w Holandii
        if (latestStatus.includes('customs clearance') || latestStatus.includes('cleared') ||
            latestStatus.includes('dispatch centre') || latestStatus.includes('arrived at our depot')) {
            deliveryDate.setDate(deliveryDate.getDate() + 3); // 2-3 dni z Holandii do Polski
        } else {
            deliveryDate.setDate(deliveryDate.getDate() + 5); // 4-5 dni jeśli jeszcze odprawa
        }
        
        return {
            status: 'netherlands_hub',
            estimatedDate: deliveryDate.toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            message: '�� W Holandii - dostawa za 3-5 dni'
        };
    }
    
    // Jeśli w Niemczech (Hamburg, Germany)
    if (latestLocation.includes('niemcy') || latestLocation.includes('germany') ||
        latestLocation.includes('hamburg')) {
        
        const deliveryDate = new Date(latestDate);
        deliveryDate.setDate(deliveryDate.getDate() + 4);
        
        return {
            status: 'germany_hub',
            estimatedDate: deliveryDate.toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            message: '🇩🇪 W Niemczech - dostawa za 3-4 dni'
        };
    }
    
    // Jeśli lot już wylądował ale jeszcze odprawa celna
    if (latestStatus.includes('flight has arrived') || latestStatus.includes('arrived at destination') ||
        latestStatus.includes('lot dotarł') || latestStatus.includes('货物已落地')) {
        
        const deliveryDate = new Date(latestDate);
        deliveryDate.setDate(deliveryDate.getDate() + 4); // Odprawa + transport = 3-4 dni
        
        return {
            status: 'arrived_customs',
            estimatedDate: deliveryDate.toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            message: '✈️ Lot dotarł do Europy - dostawa za 3-4 dni'
        };
    }
    
    // Jeśli lot wystartował z Chin
    if (latestStatus.includes('flight has departed') || latestStatus.includes('departed from origin') ||
        latestStatus.includes('lot odleciał') || latestStatus.includes('货物已起飞')) {
        
        const deliveryDate = new Date(latestDate);
        deliveryDate.setDate(deliveryDate.getDate() + 6); // Lot + odprawa + transport = 5-6 dni
        
        return {
            status: 'flight_en_route',
            estimatedDate: deliveryDate.toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            message: '✈️ Lot w drodze z Chin - dostawa za 5-6 dni'
        };
    }
    
    // Jeśli w Chinach - przygotowanie do lotu
    if (latestLocation.includes('chiny') || latestLocation.includes('china') || 
        latestLocation.includes('shanghai') || latestLocation.includes('shenzhen') ||
        latestLocation.includes('beijing') || latestStatus.includes('货物')) {
        
        const deliveryDate = new Date(latestDate);
        
        // Jeśli już opuściło centrum operacyjne
        if (latestStatus.includes('goods leave') || latestStatus.includes('outbound in sorting') ||
            latestStatus.includes('shipped out') || latestStatus.includes('货物已出货')) {
            deliveryDate.setDate(deliveryDate.getDate() + 8); // Czeka na lot = 7-8 dni
        } else if (latestStatus.includes('arrived at operating') || latestStatus.includes('货物已收货')) {
            deliveryDate.setDate(deliveryDate.getDate() + 10); // Jeszcze przetwarzanie = 9-10 dni
        } else {
            deliveryDate.setDate(deliveryDate.getDate() + 12); // Początkowe etapy = 11-12 dni
        }
        
        return {
            status: 'china_processing',
            estimatedDate: deliveryDate.toLocaleDateString('pl-PL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            message: '🇨🇳 Przetwarzanie w Chinach - dostawa za 8-12 dni'
        };
    }
    
    // Domyślnie - jeśli brak szczegółowych informacji
    const deliveryDate = new Date(latestDate);
    deliveryDate.setDate(deliveryDate.getDate() + 10);
    return {
        status: 'processing',
        estimatedDate: deliveryDate.toLocaleDateString('pl-PL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        message: '📦 W trakcie przetwarzania - dostawa za 7-10 dni'
    };
}

// ─── Funkcja formatowania lokalizacji ─────────────────────────────────────────
function formatLocation(location) {
    const locationMappings = {
        'PL': 'Polska',
        'CN': 'Chiny', 
        'DE': 'Niemcy',
        'NL': 'Holandia',
        'US': 'USA',
        'GB': 'Wielka Brytania',
        'FR': 'Francja',
        'POLAND': 'Polska',
        'CHINA': 'Chiny',
        'GERMANY': 'Niemcy',
        'NETHERLANDS': 'Holandia',
        'HOLLAND': 'Holandia'
    };
    
    if (!location || location.trim() === '') {
        return 'Brak danych o lokalizacji';
    }
    
    const cleanLocation = location.trim();

    // Chinese place names -> "Szanghaj, Chiny"
    if (/[一-鿿]/.test(cleanLocation)) {
        return `${placeName(cleanLocation)}, Chiny`;
    }
    // "Rudnik Nad Sanem,PL" -> "Rudnik Nad Sanem, Polska"
    const cityCc = cleanLocation.match(/^(.+?)\s*,\s*([A-Z]{2})$/);
    if (cityCc && locationMappings[cityCc[2]]) {
        return `${cityCc[1].trim()}, ${locationMappings[cityCc[2]]}`;
    }
    if (/^poznan$/i.test(cleanLocation)) return 'Poznań';

    // Jeśli zawiera nazwę miasta polskiego
    if (cleanLocation.includes('STALOWA WOLA') || cleanLocation.includes('WARSZAWA') || 
        cleanLocation.includes('KRAKÓW') || cleanLocation.includes('GDAŃSK') ||
        cleanLocation.includes('POZNAŃ') || cleanLocation.includes('WROCŁAW')) {
        const cityMatch = cleanLocation.match(/([A-ZĄĆĘŁŃÓŚŹŻ\s]+)/);
        if (cityMatch) {
            return `${cityMatch[1].trim()}, Polska`;
        }
        return `${cleanLocation}, Polska`;
    }
    
    // Jeśli zawiera Shanghai, Beijing itp.
    if (cleanLocation.includes('SHANGHAI') || cleanLocation.includes('BEIJING') || 
        cleanLocation.includes('GUANGZHOU') || cleanLocation.includes('SHENZHEN')) {
        return `${cleanLocation}, Chiny`;
    }
    
    // Jeśli zawiera Amsterdam, Rotterdam
    if (cleanLocation.includes('AMSTERDAM') || cleanLocation.includes('ROTTERDAM') ||
        cleanLocation.includes('EINDHOVEN')) {
        return `${cleanLocation}, Holandia`;
    }
    
    // Sprawdź kody krajów
    const upperLocation = cleanLocation.toUpperCase();
    if (locationMappings[upperLocation]) {
        return locationMappings[upperLocation];
    }
    
    // Jeśli to format "MIASTO (KOD_KRAJU)"
    const cityCountryMatch = cleanLocation.match(/^(.*?)\s*\(([A-Z]{2})\)$/);
    if (cityCountryMatch) {
        const city = cityCountryMatch[1].trim();
        const countryCode = cityCountryMatch[2];
        const country = locationMappings[countryCode] || countryCode;
        return `${city}, ${country}`;
    }
    
    // Jeśli to samo kod kraju bez nawiasów
    if (cleanLocation.length === 2 && /^[A-Z]{2}$/.test(cleanLocation)) {
        return locationMappings[cleanLocation] || cleanLocation;
    }
    
    // Zwróć oryginalną lokalizację jeśli nie ma mapowania
    return cleanLocation;
}

// ─── Kraj każdego zdarzenia (trasa przesyłki) ────────────────────────────────
// The location column is unreliable: on the DHL leg it often just repeats the
// destination country ("PL") for events that happen in Germany, and some China
// events carry "NL". A parcel never goes back along its route, so we walk the
// events oldest -> newest, change country only on solid evidence (a real city or
// airport, or an unambiguous status) and never move backwards.
const COUNTRY_NAMES = { CN: 'Chiny', HK: 'Hongkong', NL: 'Holandia', BE: 'Belgia', DE: 'Niemcy', HU: 'Węgry', CZ: 'Czechy', PL: 'Polska', GB: 'Wielka Brytania', FR: 'Francja' };
const AIRPORT_COUNTRY = { AMS: 'NL', LGG: 'BE', BRU: 'BE', LEJ: 'DE', FRA: 'DE', CGN: 'DE', MUC: 'DE', BUD: 'HU', PRG: 'CZ', WAW: 'PL', LHR: 'GB', CDG: 'FR', HKG: 'HK', PVG: 'CN', SHA: 'CN', CAN: 'CN', SZX: 'CN', PEK: 'CN', NGB: 'CN', HGH: 'CN' };
const CITY_COUNTRY = [
    [/poznan|poznań|stryk[oó]w|stalowa wola|rudnik|warszawa|wroc[lł]aw|krak[oó]w|gda[nń]sk|[lł][oó]d[zź]|katowice|piotrk[oó]w|t[oó]ru[nń]|bia[lł]ystok|lublin|rzesz[oó]w|szczecin|bydgoszcz/i, 'PL'],
    [/r[uü]dersdorf|bremen|hamburg|leipzig|lipsk|berlin|frankfurt|k[oö]ln|cologne|hannover|n[uü]rnberg|staufenberg|aschheim|krefeld|dortmund|kassel|magdeburg|saulheim/i, 'DE'],
    [/amsterdam|schiphol|rotterdam|eindhoven|oirschot|vijfhuizen|veenendaal|hoofddorp/i, 'NL'],
    [/li[eè]ge|brussels|bruksela|antwerp/i, 'BE'],
];
// Route stage of each country: origin (0) -> arrival hub (1) -> transit hub (2) -> destination (3).
function stageOf(code, dest) {
    if (code === dest) return 3;
    if (code === 'CN' || code === 'HK') return 0;
    if (code === 'DE' || code === 'CZ') return 2;
    return 1;
}

function evidenceFor(ev, dest) {
    const loc = ev.OriginalLocation || '';
    const st = ev.OriginalStatus || '';
    // 1) a real place in the location column
    if (/[一-鿿]/.test(loc)) return 'CN';
    for (const [re, cc] of CITY_COUNTRY) if (re.test(loc)) return cc;
    const withCc = loc.match(/,\s*([A-Z]{2})\s*$/);          // "Rudnik Nad Sanem,PL"
    if (withCc && loc.length > 4) return withCc[1];
    // 2) unambiguous statuses
    if (/签收|successfully delivered|delivered successfully/i.test(st)) return dest;
    let m;
    if ((m = st.match(/(?:抵达|到达)【([A-Z]{3})】/)) && AIRPORT_COUNTRY[m[1]]) return AIRPORT_COUNTRY[m[1]];
    if (/启运|出发|始发地海关|出口清关|快件到达机场|快件已出库|到达收货点|操作中心|货物移交航司|航班已起飞|flight has departed|handover to airline|export customs|预计.*航班|expected flight/i.test(st)) return 'CN';
    if (/delivery vehicle|out for delivery|prepared for delivery|arrived in the destination country/i.test(st)) return dest;
    return null; // bare country codes, generic DHL steps, info-only events: no evidence
}

function assignCountries(events, dest) {
    const chrono = [...events].sort((a, b) => new Date(a.OriginalDate) - new Date(b.OriginalDate));
    let current = 'CN';
    let arrived = false; // after the flight landed, generic DHL hub steps happen in the transit hub
    for (const ev of chrono) {
        let cc = evidenceFor(ev, dest);
        const st = ev.OriginalStatus || '';
        if (/航班已抵达|flight has arrived|拆板|dismantling|目的地清关|目的国清关|customs clearance completed pending/i.test(st)) {
            arrived = true;
            if (!cc && stageOf(current, dest) === 0) {
                const label = (ev.OriginalLocation || '').trim().toUpperCase();
                cc = label && label !== dest && COUNTRY_NAMES[label] && stageOf(label, dest) === 1 ? label : 'NL';
            }
        }
        // Generic DHL steps (pick-up, origin parcel center, line-haul) after landing but
        // before any evidence of the destination country: the German DHL hub.
        if (!cc && arrived && stageOf(current, dest) < 2 &&
            /pick-up was successful|parcel center of origin|loaded to movement|movement \/ tour vehicle arrived|instruction data/i.test(st)) {
            cc = 'DE';
        }
        if (cc && stageOf(cc, dest) >= stageOf(current, dest)) current = cc;
        ev.Kraj = current;
        ev.KrajNazwa = COUNTRY_NAMES[current] || current;
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
            signal: AbortSignal.timeout(8000) // Increased from 5000 to 8000ms
        });

        if (!response.ok) return null;

        const responseBody = await response.text();
        const $ = cheerio.load(responseBody, { decodeEntities: false });
        const trackingInfo = [];

        $('table tr:has(td:nth-child(1):not(:empty))').each((index, element) => {
            const date = $(element).find('td:nth-child(1)').text().trim();
            const location = $(element).find('td:nth-child(2)').text().trim();
            const record = $(element).find('td:nth-child(3)').text().trim();
            const recipient = $(element).find('td:nth-child(5)').text().trim() || ''; // Optional field

            if (date && record) {
                const event = { 
                    Data: date, 
                    Lokalizacja: formatLocation(location), 
                    Status: translateStatus(record, date),
                    OriginalDate: date,
                    OriginalLocation: location,
                    OriginalStatus: record
                };
                
                // Only add recipient if it exists and is not empty
                if (recipient) {
                    event.Odbiorca = recipient;
                }
                
                trackingInfo.push(event);
            }
        });

        // Sortuj zdarzenia chronologicznie (najnowsze na górze)
        trackingInfo.sort((a, b) => {
            const dateA = new Date(a.OriginalDate);
            const dateB = new Date(b.OriginalDate);
            return dateB - dateA; // Sortowanie malejące (najnowsze pierwsze)
        });

        // Header: read fields by their column label, not by position (the server
        // added a "渠道转单号" column once and every field shifted by one).
        const mainInfo = {};
        const labels = $('.menu_ ul').eq(0).find('li').map((i, el) => $(el).text().trim()).get();
        const values = $('.menu_ ul').eq(1).find('li').map((i, el) => $(el).text().trim()).get();
        const field = (...names) => {
            const i = labels.findIndex(l => names.some(n => l.includes(n)));
            return i >= 0 ? (values[i] || '') : '';
        };
        mainInfo['Numer referencyjny'] = field('参考号', 'Reference');
        mainInfo['Numer śledzenia'] = field('跟踪号码', 'Tracking');
        const carrierNo = field('渠道转单号', 'Transfer');
        if (carrierNo) mainInfo['Numer przewoźnika'] = carrierNo;
        mainInfo['Kraj'] = field('目的地', 'Destination');
        mainInfo['Data'] = field('当地时间', 'Local time', 'Time');
        mainInfo['Ostatni status'] = translateStatus(field('最新状态', 'Status').split('/')[0].trim());

        // Country of every event, following the parcel's route (see assignCountries).
        assignCountries(trackingInfo, (mainInfo['Kraj'] || 'PL').toUpperCase());

        // Dodaj informację o przewidywanym czasie dostawy
        const deliveryEstimate = calculateEstimatedDelivery(trackingInfo); // Używaj oryginalnych danych
        if (deliveryEstimate) {
            mainInfo['Przewidywana dostawa'] = deliveryEstimate.message;
            mainInfo['Data dostawy'] = deliveryEstimate.estimatedDate || 'Brak danych';
        }

        // Dodaj aktualną lokalizację paczki i odbiorcę
        if (trackingInfo.length > 0) {
            mainInfo['Aktualna lokalizacja'] = trackingInfo[0].Lokalizacja || 'Brak danych';
            
            // Znajdź odbiorcę z trackingu (zwykle ostatnie wydarzenie z dostawą)
            const recipientEvent = trackingInfo.find(e => e.Odbiorca && e.Odbiorca.trim());
            if (recipientEvent) {
                let recipient = recipientEvent.Odbiorca;
                // Clean up recipient field
                recipient = recipient.replace(/^签收/, '').trim();
                recipient = recipient.replace(/Poland,\s*The shipment has been successfully delivered\s*\/?\s*/gi, '').trim();
                recipient = recipient.replace(/Poland\s*$/i, '').trim();
                recipient = recipient.replace(/\s*\/\s*Poland\s*$/i, '').trim();
                recipient = recipient.replace(/转运中拆板\/Dismantling the board\//, '').trim();
                if (recipient) {
                    mainInfo['Odbiorca'] = recipient;
                }
            }
        }

        return trackingInfo.length > 0 ? { 
            mainInfo, 
            trackingInfo: trackingInfo, // Zwróć płaską listę (frontend sam grupuje)
            source_api: 'New Tracking Server' 
        } : null;
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
        
        // Inteligentny klucz cache (czyste dane) - DISABLED FOR DEBUG
        const cacheKey = `tracking_raw_${trimmedCode}`;
        const cachedData = null; // cache.get(cacheKey); // TEMPORARILY DISABLED
        if (cachedData) {
            return NextResponse.json({
                success: true,
                ...cachedData
            }, { status: 200, headers: { 'Cache-Control': 'no-store' }});
        }

        let data = null;
        const errors = [];

        // Use only the new IP server for all tracking
        console.log(`[TRACKING] ${trimmedCode} - Using new IP server only`);
        try {
            data = await fastIpServersRace(trimmedCode);
            if (data) {
                console.log(`[TRACKING] ${trimmedCode} - Found in new IP server`);
            } else {
                console.log(`[TRACKING] ${trimmedCode} - No data found in new IP server`);
            }
        } catch (e) {
            errors.push('New IP server: ' + e.message);
            console.log(`[TRACKING] ${trimmedCode} - Error from new IP server: ${e.message}`);
        }

        if (data && data.trackingInfo && data.trackingInfo.length > 0) {
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

        // Log errors for debugging but don't expose to user
        if (errors.length > 0) {
            console.error(`[TRACKING] ${trimmedCode} failed from all sources:`, errors);
        } else {
            console.warn(`[TRACKING] ${trimmedCode} - No data found and no errors captured`);
        }

        return NextResponse.json({ 
            success: false, 
            message: 'Nie znaleziono informacji o przesyłce. Spróbuj ponownie później.' 
        }, { status: 404 });
    } catch (error) {
        console.error('Tracking API error:', error);
        return NextResponse.json({ 
            success: false, 
            message: 'Błąd serwera. Spróbuj ponownie za chwilę.' 
        }, { status: 500 });
    }
}
