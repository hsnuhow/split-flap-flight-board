#!/usr/bin/env node
/**
 * 一次性修正 Firestore airportNames 快取中的錯誤對照
 * 執行：node scripts/fix_airport_cache.js
 */

process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                  = require('firebase-admin/firestore');

// 正確對照（覆蓋 Gemini 的錯誤快取）
const FIXES = {
    BWN: { zh: '汶萊',    en: 'Brunei'       },
    PEN: { zh: '檳城',    en: 'Penang'       },
    ROR: { zh: '帛琉',    en: 'Palau'        },
    TAK: { zh: '高松',    en: 'Takamatsu'    },
    TFU: { zh: '成都天府', en: 'Chengdu TFU' },
};

// 刪除（KTI 無標準 IATA 對應，讓 Gemini 重新解析）
const DELETES = ['KTI'];

async function main() {
    if (!getApps().length) {
        initializeApp({ projectId: 'split-flap-flight-board' });
    }
    const db  = getFirestore();
    const col = db.collection('airportNames');

    // 修正錯誤對照
    for (const [code, names] of Object.entries(FIXES)) {
        await col.doc(code).set({ ...names, source: 'manual-fix', createdAt: new Date().toISOString() });
        console.log(`✔ 修正 ${code} → ${names.zh} / ${names.en}`);
    }

    // 刪除不確定的代號
    for (const code of DELETES) {
        await col.doc(code).delete();
        console.log(`✔ 刪除 ${code}（將由 Gemini 重新解析）`);
    }

    console.log('\n完成。');
}

main().catch(e => { console.error(e); process.exit(1); });
