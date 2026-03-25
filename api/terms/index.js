// GET  /api/terms — list all terms sorted alphabetically
// POST /api/terms — create a new term

import { getDb, col, normalize, COLS } from '../_db.js';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export default async function handler(req, res) {
    try {
        const db = await getDb();

        if (req.method === 'GET') {
            const terms = await col(db, 'terms').find({}).toArray();
            return res.json(
                terms.map(normalize).sort((a, b) => a.term.localeCompare(b.term))
            );
        }

        if (req.method === 'POST') {
            const now = new Date().toISOString();
            const doc = {
                _id: generateId(),
                term: req.body.term,
                shortDefinition: req.body.shortDefinition,
                definition: req.body.definition,
                category: req.body.category,
                relatedTerms: req.body.relatedTerms || [],
                createdAt: now,
                updatedAt: now,
            };
            await col(db, 'terms').insertOne(doc);
            return res.status(201).json(normalize(doc));
        }

        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
