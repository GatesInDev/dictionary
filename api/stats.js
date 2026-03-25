// GET /api/stats — total terms, categories break-down

import { getDb, col } from './_db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const db = await getDb();
        const terms = await col(db, 'terms').find({}, { projection: { category: 1 } }).toArray();
        const cats = await col(db, 'categories').find({}).toArray();
        const categories = cats.map(c => c.name || c.category || c);

        return res.json({
            totalTerms: terms.length,
            totalCategories: categories.length,
            categories: categories.map(cat => ({
                name: cat,
                count: terms.filter(t => t.category === cat).length,
            })),
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
