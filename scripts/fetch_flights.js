#!/usr/bin/env node
/**
 * TDX Airport FIDS Data Fetcher
 * ─────────────────────────────────────────────────────────────
 * 從交通部 TDX 平台抓取桃園機場中華航空（CI）即時航班資料，
 * 儲存至 public/data/arrival.json 與 public/data/departure.json。
 *
 * 使用方式：
 *   node scripts/fetch_flights.js
 *
 * 設定憑證（取得後填入，或透過環境變數）：
 *   TDX_CLIENT_ID=xxx TDX_CLIENT_SECRET=yyy node scripts/fetch_flights.js
 *
 * 需要 Node.js >= 18（內建 fetch API）
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ================================================================
// 設定
// ================================================================
const CONFIG = {
    airport:      'TPE',
    airline:      'CI',
    clientId:     process.env.TDX_CLIENT_ID     || '',
    clientSecret: process.env.TDX_CLIENT_SECRET  || '',
    outputDir:    path.resolve(__dirname, '..', 'public', 'data'),
    tdxBase:      'https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport',
    tokenUrl:     'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
};

// ================================================================
// 機場代碼 → 顯示名稱（與 index.html 同步）
// ================================================================
const AIRPORT_NAMES = {
    NRT:{zh:'東京成田',en:'Tokyo Narita'},
    HND:{zh:'東京羽田',en:'Tokyo Haneda'},
    KIX:{zh:'大阪關西',en:'Osaka Kansai'},
    ITM:{zh:'大阪伊丹',en:'Osaka Itami'},
    NGO:{zh:'名古屋',  en:'Nagoya'},
    FUK:{zh:'福岡',    en:'Fukuoka'},
    OKA:{zh:'沖繩',    en:'Okinawa'},
    CTS:{zh:'札幌',    en:'Sapporo'},
    HIJ:{zh:'廣島',    en:'Hiroshima'},
    KMJ:{zh:'熊本',    en:'Kumamoto'},
    KOJ:{zh:'鹿兒島',  en:'Kagoshima'},
    ICN:{zh:'首爾仁川',en:'Seoul Incheon'},
    GMP:{zh:'首爾金浦',en:'Seoul Gimpo'},
    PUS:{zh:'釜山',    en:'Busan'},
    HKG:{zh:'香港',    en:'Hong Kong'},
    MFM:{zh:'澳門',    en:'Macau'},
    PEK:{zh:'北京首都',en:'Beijing Cap.'},
    PKX:{zh:'北京大興',en:'Beijing Dax.'},
    PVG:{zh:'上海浦東',en:'Shanghai PVG'},
    SHA:{zh:'上海虹橋',en:'Shanghai SHA'},
    CAN:{zh:'廣州',    en:'Guangzhou'},
    SZX:{zh:'深圳',    en:'Shenzhen'},
    XMN:{zh:'廈門',    en:'Xiamen'},
    FOC:{zh:'福州',    en:'Fuzhou'},
    CTU:{zh:'成都',    en:'Chengdu'},
    CKG:{zh:'重慶',    en:'Chongqing'},
    WUH:{zh:'武漢',    en:'Wuhan'},
    CSX:{zh:'長沙',    en:'Changsha'},
    KMG:{zh:'昆明',    en:'Kunming'},
    XIY:{zh:'西安',    en:"Xi'an"},
    HRB:{zh:'哈爾濱',  en:'Harbin'},
    SYX:{zh:'三亞',    en:'Sanya'},
    HAK:{zh:'海口',    en:'Haikou'},
    NKG:{zh:'南京',    en:'Nanjing'},
    TAO:{zh:'青島',    en:'Qingdao'},
    DLC:{zh:'大連',    en:'Dalian'},
    HGH:{zh:'杭州',    en:'Hangzhou'},
    MNL:{zh:'馬尼拉',  en:'Manila'},
    CEB:{zh:'宿霧',    en:'Cebu'},
    SIN:{zh:'新加坡',  en:'Singapore'},
    KUL:{zh:'吉隆坡',  en:'Kuala Lumpur'},
    BKK:{zh:'曼谷素萬',en:'Bangkok BKK'},
    DMK:{zh:'曼谷廊曼',en:'Bangkok DMK'},
    HAN:{zh:'河內',    en:'Hanoi'},
    SGN:{zh:'胡志明市',en:'Ho Chi Minh'},
    DAD:{zh:'峴港',    en:'Da Nang'},
    RGN:{zh:'仰光',    en:'Yangon'},
    DPS:{zh:'峇里島',  en:'Bali'},
    CGK:{zh:'雅加達',  en:'Jakarta'},
    DEL:{zh:'新德里',  en:'New Delhi'},
    DXB:{zh:'杜拜',    en:'Dubai'},
    SYD:{zh:'雪梨',    en:'Sydney'},
    MEL:{zh:'墨爾本',  en:'Melbourne'},
    BNE:{zh:'布里斯本',en:'Brisbane'},
    LAX:{zh:'洛杉磯',  en:'Los Angeles'},
    SFO:{zh:'舊金山',  en:'San Francisco'},
    JFK:{zh:'紐約',    en:'New York JFK'},
    ORD:{zh:'芝加哥',  en:'Chicago'},
    SEA:{zh:'西雅圖',  en:'Seattle'},
    YVR:{zh:'溫哥華',  en:'Vancouver'},
    AMS:{zh:'阿姆斯特丹',en:'Amsterdam'},
    LHR:{zh:'倫敦',    en:'London'},
    CDG:{zh:'巴黎',    en:'Paris'},
    FRA:{zh:'法蘭克福',en:'Frankfurt'},
    VIE:{zh:'維也納',  en:'Vienna'},
    ZRH:{zh:'蘇黎世',  en:'Zurich'},
    FCO:{zh:'羅馬',    en:'Rome'},
    GUM:{zh:'關島',    en:'Guam'},
    TPE:{zh:'桃園',    en:'Taoyuan'},
    TSA:{zh:'台北松山',en:'Taipei Songshan'},
    KHH:{zh:'高雄',    en:'Kaohsiung'},
    RMQ:{zh:'台中',    en:'Taichung'},
};

function getAirportName(code, lang) {
    if (!code) return '---';
    const entry = AIRPORT_NAMES[code];
    if (!entry) return code;
    return lang === 'zh' ? entry.zh : entry.en;
}

function formatTime(iso) {
    if (!iso) return '--:--';
    const m = iso.match(/T(\d{2}:\d{2})/);
    return m ? m[1] : '--:--';
}

// ================================================================
// TDX 認證
// ================================================================
async function getToken() {
    if (!CONFIG.clientId || !CONFIG.clientSecret) {
        console.log('ℹ️  未設定憑證，以訪客模式執行（限速）');
        return null;
    }

    console.log('🔑 取得 TDX Bearer Token…');
    const body = new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     CONFIG.clientId,
        client_secret: CONFIG.clientSecret,
    });

    const res = await fetch(CONFIG.tokenUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`TDX 認證失敗 (${res.status}): ${txt}`);
    }

    const { access_token } = await res.json();
    console.log('✅ Token 取得成功');
    return access_token;
}

// ================================================================
// 資料抓取與正規化
// ================================================================
function normalizeFlights(rawList, type) {
    const isArr = (type === 'arrival');

    return rawList
        .filter(f => f.AirlineID === CONFIG.airline && !f.IsCargo)
        .map(f => {
            const airportCode = isArr ? f.DepartureAirportID : f.ArrivalAirportID;
            const time = isArr
                ? formatTime(f.ScheduleArrivalTime)
                : formatTime(f.ScheduleDepartureTime);

            return {
                terminal:      f.Terminal || '--',
                flightNumber:  `${f.AirlineID}${f.FlightNumber}`,
                airportCode:   airportCode || '',
                airportNameZh: getAirportName(airportCode, 'zh'),
                airportNameEn: getAirportName(airportCode, 'en'),
                scheduledTime: time,
                // 以下欄位備用（不一定顯示）
                gate:          f.Gate          || '',
                checkCounter:  f.CheckCounter  || '',
                baggageClaim:  f.BaggageClaim  || '',
                statusZh:      f.ArrivalRemark    || f.DepartureRemark    || '',
                statusEn:      f.ArrivalRemarkEn  || f.DepartureRemarkEn  || '',
            };
        })
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

async function fetchType(type, token) {
    const typePath = type === 'arrival' ? 'Arrival' : 'Departure';
    // OData filter: 直接在 API 層過濾，減少傳輸量
    const filter   = `AirlineID eq '${CONFIG.airline}'`;
    const url      = `${CONFIG.tdxBase}/${typePath}/${CONFIG.airport}?$filter=${encodeURIComponent(filter)}&$format=JSON`;

    const headers = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    console.log(`📡 抓取 ${type} 資料…`);
    const res = await fetch(url, { headers });

    if (res.status === 401) {
        throw new Error(
            '401 Unauthorized：TDX 訪客模式可能不支援此 API。\n' +
            '請至 https://tdx.transportdata.tw 註冊並取得 client_id / client_secret。'
        );
    }
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`API 錯誤 (${res.status}): ${txt.slice(0, 200)}`);
    }

    const raw = await res.json();
    // TDX 回傳格式可能是陣列或 { data: [...] }
    const list = Array.isArray(raw) ? raw : (raw.data || raw.Flights || []);

    return normalizeFlights(list, type);
}

// ================================================================
// 主流程
// ================================================================
async function main() {
    console.log('═══════════════════════════════════════');
    console.log('  CAL Board – TDX 航班資料抓取腳本');
    console.log(`  機場：${CONFIG.airport}　航空：${CONFIG.airline}`);
    console.log('═══════════════════════════════════════');

    let token;
    try {
        token = await getToken();
    } catch (e) {
        console.error('❌', e.message);
        process.exit(1);
    }

    let arrivalFlights, departureFlights;
    try {
        arrivalFlights   = await fetchType('arrival',   token);
        departureFlights = await fetchType('departure', token);
    } catch (e) {
        console.error('❌', e.message);
        process.exit(1);
    }

    const updatedAt = new Date().toISOString();
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });

    const arrOutput = { updatedAt, airport: CONFIG.airport, flights: arrivalFlights };
    const depOutput = { updatedAt, airport: CONFIG.airport, flights: departureFlights };

    fs.writeFileSync(
        path.join(CONFIG.outputDir, 'arrival.json'),
        JSON.stringify(arrOutput, null, 2),
        'utf8'
    );
    fs.writeFileSync(
        path.join(CONFIG.outputDir, 'departure.json'),
        JSON.stringify(depOutput, null, 2),
        'utf8'
    );

    console.log(`✅ 入境航班：${arrivalFlights.length} 筆`);
    console.log(`✅ 出境航班：${departureFlights.length} 筆`);
    console.log(`✅ 儲存至 ${CONFIG.outputDir}`);
    console.log('═══════════════════════════════════════');
    console.log('下一步：執行 firebase deploy 部署更新');
}

main().catch(err => {
    console.error('❌ 未預期錯誤：', err);
    process.exit(1);
});
