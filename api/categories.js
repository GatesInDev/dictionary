// GET /api/categories — unique category list

import { getDb, col } from './_db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const db = await getDb();
        const cats = await col(db, 'categories').find({}).toArray();
        const catNames = cats.map(c => c.name || c.category || c).sort();
        return res.json(catNames);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
