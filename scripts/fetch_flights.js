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
// 機場代碼 → 顯示名稱（從 public/data/airports.json 載入）
// ================================================================
const AIRPORT_NAMES = JSON.parse(
    fs.readFileSync(path.resolve(CONFIG.outputDir, 'airports.json'), 'utf8')
);

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

// TDX 的狀態欄位有時將中英文合併在同一字串（如「已到ARRIVED」「準時ON TIME」）
// 此函式將其拆開為 { zh, en }
function parseStatus(raw, rawEn) {
    const str = raw || '';
    const strEn = rawEn || '';
    // 若 strEn 有值，直接使用
    if (strEn) return { zh: str, en: strEn };
    // 否則從合併字串中抽取：中文部分 + 英文部分
    const zh = (str.match(/[\u4e00-\u9fff]+/g) || []).join('');
    const en = (str.match(/[A-Z][A-Z ]+/g) || []).map(s => s.trim()).join(' ');
    return { zh: zh || str, en: en || str };
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
                ...(() => {
                    const s = parseStatus(
                        f.ArrivalRemark    || f.DepartureRemark    || '',
                        f.ArrivalRemarkEn  || f.DepartureRemarkEn  || ''
                    );
                    return { statusZh: s.zh, statusEn: s.en };
                })(),
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
