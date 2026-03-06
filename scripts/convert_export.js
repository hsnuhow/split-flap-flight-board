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

// ── 機場名稱對照表 ────────────────────────────────────
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
    // 貨機常見機場
    ANC:{zh:'安克拉治', en:'Anchorage'},
    ORK:{zh:'科克',     en:'Cork'},
    MIA:{zh:'邁阿密',   en:'Miami'},
    ATL:{zh:'亞特蘭大', en:'Atlanta'},
    DFW:{zh:'達拉斯',   en:'Dallas'},
    IAH:{zh:'休士頓',   en:'Houston'},
    MSP:{zh:'明尼亞波利',en:'Minneapolis'},
    DTW:{zh:'底特律',   en:'Detroit'},
    BOS:{zh:'波士頓',   en:'Boston'},
};

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
