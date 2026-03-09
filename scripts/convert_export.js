#!/usr/bin/env node
/**
 * convert_export.js
 * 將匯出的靜態航班 JSON 轉換為看板所需的 arrival.json / departure.json
 * 使用方式：node scripts/convert_export.js <JSON檔案路徑>
 * 範例：node scripts/convert_export.js ~/Desktop/0a24c76546d3d3e9df17bdc7d77bce48_export.json
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── 設定 ──────────────────────────────────────────────
const INPUT_FILE = process.argv[2] || path.resolve(__dirname, '../../0a24c76546d3d3e9df17bdc7d77bce48_export.json');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'public', 'data');
const HOME_AIRPORT = 'TPE';
const AIRLINE_FILTER = 'CI';

// ── 機場名稱對照表（從 public/data/airports.json 載入）────
const AIRPORT_NAMES = JSON.parse(
    fs.readFileSync(path.resolve(OUTPUT_DIR, 'airports.json'), 'utf8')
);

function airportName(code, lang) {
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

// ── 主流程 ────────────────────────────────────────────
function main() {
    console.log('═══════════════════════════════════════════════');
    console.log('  航班資料轉換工具');
    console.log(`  來源：${INPUT_FILE}`);
    console.log('═══════════════════════════════════════════════');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ 找不到檔案：${INPUT_FILE}`);
        console.error('   請確認路徑是否正確，或傳入參數：');
        console.error('   node scripts/convert_export.js /path/to/export.json');
        process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    const all = Array.isArray(raw) ? raw : (raw.data || raw.flights || []);
    console.log(`✅ 讀取完成：共 ${all.length} 筆記錄`);

    // 過濾中華航空
    const ciFlights = all.filter(f => f['航空公司'] === AIRLINE_FILTER);
    console.log(`✅ ${AIRLINE_FILTER} 航班：${ciFlights.length} 筆`);

    // ── 出境：出發地 = TPE ──
    const departures = ciFlights
        .filter(f => f['出發地'] === HOME_AIRPORT)
        .map(f => {
            const destCode = f['目的地'] || '';
            return {
                terminal:      '--',
                flightNumber:  f['航班號'] || '',
                airportCode:   destCode,
                airportNameZh: airportName(destCode, 'zh'),
                airportNameEn: airportName(destCode, 'en'),
                scheduledTime: formatTime(f['表訂起飛時間']),
                statusZh:      '',
                statusEn:      '',
            };
        })
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    // ── 入境：目的地 = TPE ──
    const arrivals = ciFlights
        .filter(f => f['目的地'] === HOME_AIRPORT)
        .map(f => {
            const origCode = f['出發地'] || '';
            return {
                terminal:      '--',
                flightNumber:  f['航班號'] || '',
                airportCode:   origCode,
                airportNameZh: airportName(origCode, 'zh'),
                airportNameEn: airportName(origCode, 'en'),
                scheduledTime: formatTime(f['表定抵達時間']),
                statusZh:      '',
                statusEn:      '',
            };
        })
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    console.log(`   出境（TPE→）：${departures.length} 筆`);
    console.log(`   入境（→TPE）：${arrivals.length} 筆`);

    // ── 寫入檔案 ──
    const updatedAt = new Date().toISOString();
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'departure.json'),
        JSON.stringify({ updatedAt, airport: HOME_AIRPORT, flights: departures }, null, 2),
        'utf8'
    );
    fs.writeFileSync(
        path.join(OUTPUT_DIR, 'arrival.json'),
        JSON.stringify({ updatedAt, airport: HOME_AIRPORT, flights: arrivals }, null, 2),
        'utf8'
    );

    console.log(`✅ 寫入：${OUTPUT_DIR}/departure.json`);
    console.log(`✅ 寫入：${OUTPUT_DIR}/arrival.json`);
    console.log('═══════════════════════════════════════════════');

    // 印出前 3 筆預覽
    console.log('\n── 出境前 3 筆 ──');
    departures.slice(0, 3).forEach(f =>
        console.log(`  ${f.flightNumber}  ${f.scheduledTime}  ${f.airportCode} ${f.airportNameZh}`)
    );
    console.log('\n── 入境前 3 筆 ──');
    arrivals.slice(0, 3).forEach(f =>
        console.log(`  ${f.flightNumber}  ${f.scheduledTime}  ${f.airportCode} ${f.airportNameZh}`)
    );
}

main();
