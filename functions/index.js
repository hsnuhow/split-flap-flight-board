'use strict';

/**
 * CAL Flight Board – Cloud Function API Proxy
 * ─────────────────────────────────────────────────────────────
 * 代理 TDX API，憑證安全存於 Firebase Secret Manager，
 * 前端不再持有任何 secret。
 *
 * 端點：GET /api/flights?type=arrival|departure
 *
 * 部署前需設定 secrets（只需執行一次）：
 *   firebase functions:secrets:set TDX_CLIENT_ID
 *   firebase functions:secrets:set TDX_CLIENT_SECRET
 * ─────────────────────────────────────────────────────────────
 */

const { onRequest }    = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const TDX_CLIENT_ID     = defineSecret('TDX_CLIENT_ID');
const TDX_CLIENT_SECRET = defineSecret('TDX_CLIENT_SECRET');

const AIRPORT    = 'TPE';
const AIRLINE    = 'CI';
const TDX_BASE   = 'https://tdx.transportdata.tw/api/basic/v2/Air/FIDS/Airport';
const TOKEN_URL  = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token';

// ── 機場名稱（由 predeploy hook 從 public/data/airports.json 複製而來）──
const AIRPORT_NAMES = require('./airports.json');

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
            const bland = /^(準時|ON TIME|)$/i;
            const existing = seen.get(key);
            if (bland.test(existing.statusZh) && !bland.test(f.statusZh)) {
                seen.set(key, f);
            }
        }
    }
    return Array.from(seen.values());
}

function normalizeFlights(rawList, type) {
    const isArr = (type === 'arrival');
    const normalized = rawList
        .filter(f => f.AirlineID === AIRLINE && !f.IsCargo)
        .map(f => {
            const airportCode = isArr ? f.DepartureAirportID : f.ArrivalAirportID;
            const time        = isArr ? formatTime(f.ScheduleArrivalTime) : formatTime(f.ScheduleDepartureTime);
            const s = parseStatus(
                f.ArrivalRemark   || f.DepartureRemark   || '',
                f.ArrivalRemarkEn || f.DepartureRemarkEn || ''
            );
            return {
                terminal:      f.Terminal || '--',
                flightNumber:  `${f.AirlineID}${f.FlightNumber}`,
                airportCode:   airportCode || '',
                airportNameZh: getAirportName(airportCode, 'zh'),
                airportNameEn: getAirportName(airportCode, 'en'),
                scheduledTime: time,
                statusZh:      s.zh,
                statusEn:      s.en,
            };
        });
    return deduplicateFlights(normalized)
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

async function fetchFlights(type, token) {
    const typePath = type === 'arrival' ? 'Arrival' : 'Departure';
    const filter   = `AirlineID eq '${AIRLINE}'`;
    const url      = `${TDX_BASE}/${typePath}/${AIRPORT}?$filter=${encodeURIComponent(filter)}&$format=JSON`;
    const headers  = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`TDX ${type} ${res.status}`);
    const raw  = await res.json();
    const list = Array.isArray(raw) ? raw : (raw.data || raw.Flights || []);
    return normalizeFlights(list, type);
}

// ── Cloud Function 進入點 ────────────────────────────────────
exports.api = onRequest(
    { secrets: [TDX_CLIENT_ID, TDX_CLIENT_SECRET], region: 'asia-east1' },
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
            const token   = await getToken(TDX_CLIENT_ID.value(), TDX_CLIENT_SECRET.value());
            const flights = await fetchFlights(type, token);
            res.set('Cache-Control', 'no-store');
            res.json({ updatedAt: new Date().toISOString(), airport: AIRPORT, flights });
        } catch(e) {
            console.error('API error:', e.message);
            res.status(502).json({ error: e.message });
        }
    }
);
