// GET /api/terms/:id  — single term
// PUT /api/terms/:id  — update term
// DELETE /api/terms/:id — delete term

import { getDb, col, normalize } from '../_db.js';

export default async function handler(req, res) {
    const { id } = req.query;

    try {
        const db = await getDb();

        if (req.method === 'GET') {
            const doc = await col(db, 'terms').findOne({ _id: id });
            if (!doc) return res.status(404).json({ error: 'Term not found' });
            return res.json(normalize(doc));
        }

        if (req.method === 'PUT') {
            const { id: _ignore, _id: _ignore2, ...fields } = req.body;
            const update = { ...fields, updatedAt: new Date().toISOString() };

            const doc = await col(db, 'terms').findOneAndUpdate(
                { _id: id },
                { $set: update },
                { returnDocument: 'after' }
            );
            if (!doc) return res.status(404).json({ error: 'Term not found' });
            return res.json(normalize(doc));
        }

        if (req.method === 'DELETE') {
            const result = await col(db, 'terms').deleteOne({ _id: id });
            if (!result.deletedCount) return res.status(404).json({ error: 'Term not found' });
            return res.json({ success: true });
        }

        res.setHeader('Allow', 'GET, PUT, DELETE');
        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
