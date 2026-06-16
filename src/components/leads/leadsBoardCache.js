/**
 * Hard reload va boshqa sahifadan qaytganda pagination datani
 * localStorage da saqlash — qayta GET qilmaslik uchun.
 *
 * TTL: 2 soat. Hajm nazorati: har bir entry max ~300KB.
 */

const CACHE_VERSION = "v1";
const TTL_MS = 2 * 60 * 60 * 1000; // 2 soat
const MAX_LIDS_PER_ENTRY = 500;     // xotirani cheklash uchun

function cacheStorageKey(sessionKey, filterSig) {
    return `volidam:leadsBoardCache:${CACHE_VERSION}:${sessionKey}|${filterSig}`;
}

export function leadsBoardCacheKey(sessionKey, filterSig) {
    return cacheStorageKey(sessionKey, filterSig);
}

export function readLeadsBoardCache(sessionKey, filterSig) {
    try {
        const raw = localStorage.getItem(cacheStorageKey(sessionKey, filterSig));
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || typeof o !== "object") return null;
        // TTL tekshiruv
        if (Date.now() - (Number(o.ts) || 0) > TTL_MS) {
            localStorage.removeItem(cacheStorageKey(sessionKey, filterSig));
            return null;
        }
        return o;
    } catch {
        return null;
    }
}

export function writeLeadsBoardCache(sessionKey, filterSig, snapshot) {
    if (!snapshot?.statuses?.length) return;
    try {
        // Juda katta bo'lmasligi uchun har statusdagi lidlar sonini cheklaymiz
        const safeLidsByStatus = {};
        let total = 0;
        for (const [key, lids] of Object.entries(snapshot.lidsByStatus ?? {})) {
            const remaining = Math.max(0, MAX_LIDS_PER_ENTRY - total);
            if (remaining === 0) break;
            safeLidsByStatus[key] = (lids ?? []).slice(0, remaining);
            total += safeLidsByStatus[key].length;
        }

        const entry = {
            statuses: snapshot.statuses,
            lidsByStatus: safeLidsByStatus,
            counts: snapshot.counts,
            page: snapshot.page,
            totalPages: snapshot.totalPages,
            paginationTotal: snapshot.paginationTotal,
            ts: Date.now(),
        };

        localStorage.setItem(
            cacheStorageKey(sessionKey, filterSig),
            JSON.stringify(entry)
        );
    } catch {
        /* quota — jimgina o'tkazib yuboramiz */
    }
}

export function clearLeadsBoardCache(sessionKey, filterSig) {
    try {
        localStorage.removeItem(cacheStorageKey(sessionKey, filterSig));
    } catch {
        /* ignore */
    }
}
