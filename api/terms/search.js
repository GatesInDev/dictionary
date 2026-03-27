import { getDb, col, normalize } from '../_db.js';

function matchTier(t, q) {
    if (t.term.toLowerCase().includes(q)) return 0;
    if (
        t.category.toLowerCase().includes(q) ||
        (t.relatedTerms || []).some(tag => tag.toLowerCase().includes(q))
    ) return 1;
    if (
        t.shortDefinition.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q)
    ) return 2;
    return -1;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const q = (req.query.q || '').toLowerCase().trim();
        const db = await getDb();

        if (!q) {
            const terms = await col(db, 'terms').find({}).toArray();
            return res.json(
                terms.map(normalize).sort((a, b) => a.term.localeCompare(b.term))
            );
        }

        const rgx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const terms = await col(db, 'terms').find({
            $or: [
                { term: rgx },
                { category: rgx },
                { relatedTerms: rgx },
                { shortDefinition: rgx },
                { definition: rgx },
            ]
        }).toArray();

        const result = terms
            .map(normalize)
            .map(t => ({ t, tier: matchTier(t, q) }))
            .filter(({ tier }) => tier !== -1)
            .sort((a, b) => a.tier !== b.tier ? a.tier - b.tier : a.t.term.localeCompare(b.t.term))
            .map(({ t }) => t);

        return res.json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
