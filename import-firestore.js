const admin = require("firebase-admin");
const xlsx = require("xlsx");

admin.initializeApp({
    credential: admin.credential.cert(require("./serviceAccount.json")),
});

const db = admin.firestore();

const COLLECTION = "videos"; // ✅ koleksiyon adı

function cleanString(v) {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length ? s : null;
}

function ensureMp4(name) {
    const s = cleanString(name);
    if (!s) return null;
    return s.toLowerCase().endsWith(".mp4") ? s : `${s}.mp4`;
}

function toInt(v) {
    if (v == null || v === "") return null;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) ? n : null;
}

function toBool(v) {
    if (v === true || v === false) return v;
    if (v == null) return null;

    const s = String(v).trim().toLowerCase();
    if (["true", "1", "yes", "y", "evet", "var", "ekipmanlı", "withequipment", "with"].includes(s)) return true;
    if (["false", "0", "no", "n", "hayır", "yok", "ekipmansız", "withoutequipment", "without"].includes(s)) return false;

    return null;
}

function mapAgeGroupToRange(ageGroup) {
    switch (ageGroup) {
        case 1: return { ageStart: 6, ageEnd: 10 };
        case 2: return { ageStart: 11, ageEnd: 13 };
        case 3: return { ageStart: 14, ageEnd: 18 };
        default: return { ageStart: null, ageEnd: null };
    }
}

function mapDifficulty(v) {
    const n = toInt(v);
    switch (n) {
        case 1: return { difficultyLevel: 1, difficulty: "1" };
        case 2: return { difficultyLevel: 2, difficulty: "2" };
        case 3: return { difficultyLevel: 3, difficulty: "3" };
        case 4: return { difficultyLevel: 4, difficulty: "4" };
        case 5: return { difficultyLevel: 5, difficulty: "5" };
        default: {
            const s = cleanString(v)?.toLowerCase();
            return s ? { difficulty: s } : {};
        }
    }
}

function normalizeRow(r) {
    const name = cleanString(r.name);

    const ageGroup = toInt(r.age); // Excel'den 1/2/3
    const { ageStart, ageEnd } = mapAgeGroupToRange(ageGroup);

    const equipment = toBool(r.equipment);

    const diff = mapDifficulty(r.difficulty);

    const out = {
        // ✅ name değeri hem name hem id alanında
        name: name,
        id: name,

        // ✅ Excel'den gelen videoName sonuna .mp4 eklenir
        videoName: ensureMp4(r.videoName),

        ageGroup: ageGroup ?? undefined,
        ageStart: ageStart ?? undefined,
        ageEnd: ageEnd ?? undefined,

        equipment: equipment ?? undefined,
        equipmentDetail: equipment ? cleanString(r.equipmentDetail) : "",

        category: cleanString(r.category),
        categoryDetail: cleanString(r.categoryDetail),

        ...diff,

        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // null/undefined alanları sil
    Object.keys(out).forEach((k) => {
        if (out[k] == null) delete out[k];
    });

    return out;
}

async function run() {
    const wb = xlsx.readFile("./data.xlsx", { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: null });

    if (!rows.length) {
        return;
    }

    const writer = db.bulkWriter();
    writer.onWriteError((err) => {
        console.error("❌", err.documentRef.path, err.message);
        return err.failedAttempts < 5;
    });

    let count = 0;

    for (const r of rows) {
        const data = normalizeRow(r);

        // ✅ docId auto/random
        const ref = db.collection(COLLECTION).doc();

        writer.set(ref, data, { merge: false });

        count++;
        if (count % 100 === 0) console.log(`✅ ${count} kayıt kuyruğa alındı...`);
    }

    await writer.close();
    console.log(`✅ Bitti. Toplam yazılan: ${count}`);
    console.log("Not: DocId random olduğu için scripti tekrar çalıştırırsan duplicate oluşur.");
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
