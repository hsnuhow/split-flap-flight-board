'use strict';

/**
 * CAL Flight Board – Cloud Function API Proxy
 * ─────────────────────────────────────────────────────────────
 * 代理 TDX API，憑證安全存於 Firebase Secret Manager，
 * 前端不再持有任何 secret。
 *
 * 端點：GET /api/flights?type=arrival|departure
 *
 * 機場名稱解析（三層）：
 *   1. airports.json       靜態查對表（最快，無網路）
 *   2. Firestore airportNames  動態快取（Gemini 解析過的結果）
 *   3. Gemini API          未知代號的最終後備，結果自動存入 Firestore
 *
 * 部署前需設定 secrets（只需執行一次）：
 *   firebase functions:secrets:set TDX_CLIENT_ID
 *   firebase functions:secrets:set TDX_CLIENT_SECRET
 *   firebase functions:secrets:set GEMINI_API_KEY
 * ─────────────────────────────────────────────────────────────
 */

const { onRequest }     = require('firebase-functions/v2/https');
const { defineSecret }  = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore }  = require('firebase-admin/firestore');

const TDX_CLIENT_ID     = defineSecret('TDX_CLIENT_ID');
const TDX_CLIENT_SECRET = defineSecret('TDX_CLIENT_SECRET');
const GEMINI_API_KEY    = defineSecret('GEMINI_API_KEY');

const AIRPORT    = 'TPE';
const AIRLINE    = 'CI';

// 出境白名單：僅顯示 CSV 指定的 16 班出境航班
const ALLOWED_DEPARTURE_FLIGHTS = new Set([
    '81','36','12','24','73','61','63','75',
    '22','4','67','57','8','51','32','53'
]);

// 入境來源機場：這些目的地城市飛回 TPE 的 CI 航班
const TARGET_AIRPORTS = new Set([
    'LHR','PHX','JFK','ONT','AMS','FRA','VIE','FCO',
    'SEA','SFO','PRG','MEL','LAX','SYD','YVR','BNE','AKL'
]);
const TDX_BASE   = 'https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport';
const TOKEN_URL  = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

// ── 機場名稱靜態查對表（由 predeploy hook 從 public/data/airports.json 複製而來）──
const AIRPORT_NAMES = require('./airports.json');

initializeApp();
const db = getFirestore();

// ── 三層機場名稱解析 ─────────────────────────────────────────
// Layer 1: airports.json → Layer 2: Firestore → Layer 3: Gemini（存入 Firestore）
async function resolveAirport(code, geminiKey) {
    if (!code) return { zh: '---', en: '---' };

    // Layer 1: 靜態 airports.json（同步，無網路請求）
    const entry = AIRPORT_NAMES[code];
    if (entry) return { zh: entry.zh, en: entry.en };

    // Layer 2: Firestore 動態快取
    try {
        const doc = await db.collection('airportNames').doc(code).get();
        if (doc.exists) {
            const d = doc.data();
            return { zh: d.zh || code, en: d.en || code };
        }
    } catch (e) {
        console.warn(`[Firestore] lookup failed for ${code}:`, e.message);
    }

    // Layer 3: Gemini API（只在未知代號時呼叫，結果永久存入 Firestore）
    if (geminiKey) {
        try {
            const prompt =
                `給定 ICAO 機場代號 "${code}"，` +
                `請提供台灣航班資訊顯示板慣用的繁體中文城市名稱（簡短，最多 6 個漢字）` +
                `與英文短名稱（最多 14 字元）。` +
                `只回傳 JSON，格式：{"zh":"城市名","en":"City Name"}，不要其他文字。`;

            const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents:         [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' },
                }),
            });

            if (res.ok) {
                const json   = await res.json();
                const text   = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const parsed = JSON.parse(text);
                if (parsed.zh && parsed.en) {
                    await db.collection('airportNames').doc(code).set({
                        zh:        parsed.zh,
                        en:        parsed.en,
                        source:    'gemini',
                        createdAt: new Date().toISOString(),
                    });
                    console.log(`[Gemini] Resolved ${code} → ${parsed.zh} / ${parsed.en}`);
                    return { zh: parsed.zh, en: parsed.en };
                }
            } else {
                console.warn(`[Gemini] HTTP ${res.status} for ${code}`);
            }
        } catch (e) {
            console.warn(`[Gemini] lookup failed for ${code}:`, e.message);
        }
    }

    return { zh: code, en: code }; // 最終退路：回傳原始 ICAO 代號
}

function formatTime(iso) {
    if (!iso) return '--:--';
    const m = iso.match(/T(\d{2}:\d{2})/);
    return m ? m[1] : '--:--';
}

function parseStatus(raw, rawEn) {
    const str   = raw   || '';
    const strEn = rawEn || '';
    if (strEn) return { zh: str, en: strEn };
    const zh = (str.match(/[\u4e00-\u9fff]+/g) || []).join('');
    const en = (str.match(/[A-Z][A-Z ]+/g)     || []).map(s => s.trim()).join(' ');
    return { zh: zh || str, en: en || str };
}

function deduplicateFlights(flights) {
    const seen = new Map();
    for (const f of flights) {
        const key = `${f.flightNumber}|${f.scheduledTime}|${f.airportCode}`;
        if (!seen.has(key)) {
            seen.set(key, f);
        } else {
            const bland    = /^(準時|ON TIME|)$/i;
            const existing = seen.get(key);
            if (bland.test(existing.statusZh) && !bland.test(f.statusZh)) {
                seen.set(key, f);
            }
        }
    }
    return Array.from(seen.values());
}

// CI53（布里斯本/奧克蘭）合併：同航班號＋時刻出現 BNE + AKL 兩筆時合併為一筆
function mergeCi53(flights) {
    const ci53 = flights.filter(f => f.flightNumber === 'CI53');
    if (ci53.length <= 1) return flights;
    const merged = {
        ...ci53[0],
        airportCode:   'BNE/AKL',
        airportNameZh: '布里斯本/奧克蘭',
        airportNameEn: 'Brisbane/Auckland',
    };
    return [...flights.filter(f => f.flightNumber !== 'CI53'), merged];
}

async function normalizeFlights(rawList, type, geminiKey) {
    const isArr   = (type === 'arrival');
    const filtered = rawList.filter(f => {
        if (f.AirlineID !== AIRLINE || f.IsCargo) return false;
        if (isArr) {
            return TARGET_AIRPORTS.has(f.DepartureAirportID);
        } else {
            return ALLOWED_DEPARTURE_FLIGHTS.has(String(f.FlightNumber));
        }
    });

    // 收集唯一機場代號，批次並行解析（每個代號在同一請求內只呼叫一次 Gemini）
    const uniqueCodes = [
        ...new Set(
            filtered
                .map(f => isArr ? f.DepartureAirportID : f.ArrivalAirportID)
                .filter(Boolean)
        ),
    ];
    const codeMap = {};
    await Promise.all(uniqueCodes.map(async (code) => {
        codeMap[code] = await resolveAirport(code, geminiKey);
    }));

    const normalized = filtered.map(f => {
        const airportCode = isArr ? f.DepartureAirportID : f.ArrivalAirportID;
        const time        = isArr
            ? formatTime(f.ScheduleArrivalTime)
            : formatTime(f.ScheduleDepartureTime);
        const s       = parseStatus(
            f.ArrivalRemark   || f.DepartureRemark   || '',
            f.ArrivalRemarkEn || f.DepartureRemarkEn || ''
        );
        const airport = codeMap[airportCode] || { zh: airportCode || '---', en: airportCode || '---' };
        return {
            terminal:      f.Terminal || '--',
            flightNumber:  `${f.AirlineID}${f.FlightNumber}`,
            airportCode:   airportCode || '',
            airportNameZh: airport.zh,
            airportNameEn: airport.en,
            scheduledTime: time,
            gate:          (f.Gate || '').trim() || '--',
            statusZh:      s.zh,
            statusEn:      s.en,
        };
    });

    return mergeCi53(deduplicateFlights(normalized))
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

async function getToken(clientId, clientSecret) {
    if (!clientId || !clientSecret) return null;
    const body = new URLSearchParams({
        grant_type:    'client_credentials',
        client_id:     clientId,
        client_secret: clientSecret,
    });
    const res = await fetch(TOKEN_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });
    if (!res.ok) throw new Error(`TDX auth failed: ${res.status}`);
    return (await res.json()).access_token;
}

async function fetchFlights(type, token, geminiKey) {
    const typePath = type === 'arrival' ? 'Arrival' : 'Departure';
    const filter   = `AirlineID eq '${AIRLINE}'`;
    const url      = `${TDX_BASE}/${typePath}/${AIRPORT}?$filter=${encodeURIComponent(filter)}&$format=JSON`;
    const headers  = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`TDX ${type} ${res.status}`);
    const raw  = await res.json();
    const list = Array.isArray(raw) ? raw : (raw.data || raw.Flights || []);
    return normalizeFlights(list, type, geminiKey);
}

// ── Cloud Function 進入點 ────────────────────────────────────
exports.api = onRequest(
    { secrets: [TDX_CLIENT_ID, TDX_CLIENT_SECRET, GEMINI_API_KEY], region: 'asia-east1' },
    async (req, res) => {
        // CORS
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

        const type = req.query.type;
        if (!['arrival', 'departure'].includes(type)) {
            res.status(400).json({ error: 'type must be arrival or departure' });
            return;
        }

        try {
            const geminiKey = GEMINI_API_KEY.value();
            const token     = await getToken(TDX_CLIENT_ID.value(), TDX_CLIENT_SECRET.value());
            const flights   = await fetchFlights(type, token, geminiKey);
            res.set('Cache-Control', 'no-store');
            res.json({ updatedAt: new Date().toISOString(), airport: AIRPORT, flights });
        } catch (e) {
            console.error('API error:', e.message);
            res.status(502).json({ error: e.message });
        }
    }
);
