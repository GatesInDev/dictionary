// ============================================
// Express Server — WebWiki Backend
// ============================================
// Serves the static frontend files AND the REST API.
// All API routes are prefixed with /api.
// ============================================

import express from 'express';
import { MongoClient } from 'mongodb';
import { mongoConfig } from './scripts/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the static frontend from the project root
app.use(express.static('.'));

// ── DB connection ────────────────────────────────────────────────────────────

let _db;

async function getDb() {
    if (!_db) {
        const client = new MongoClient(mongoConfig.uri, mongoConfig.options);
        await client.connect();
        _db = client.db(mongoConfig.dbName);
        console.log(`✅ Connected to MongoDB — db: "${mongoConfig.dbName}"`);
    }
    return _db;
}

function col(db) {
    return db.collection(mongoConfig.collectionName);
}

/** Map a MongoDB doc to the shape the frontend expects */
function normalize(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: String(_id), ...rest };
}

// ── Helper: generate a short unique ID (same style as old localStorage layer) ──
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ── Helper: 3-tier search priority ────────────────────────────────────────────
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

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/terms — all terms sorted alphabetically
app.get('/api/terms', async (req, res) => {
    try {
        const db = await getDb();
        const terms = await col(db).find({}).toArray();
        res.json(terms.map(normalize).sort((a, b) => a.term.localeCompare(b.term)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/terms/search?q=xxx — prioritised search (must come before /:id)
app.get('/api/terms/search', async (req, res) => {
    try {
        const q = (req.query.q || '').toLowerCase().trim();
        const db = await getDb();

        if (!q) {
            const terms = await col(db).find({}).toArray();
            return res.json(terms.map(normalize).sort((a, b) => a.term.localeCompare(b.term)));
        }

        const rgx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const terms = await col(db).find({
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

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/terms/:id — single term
app.get('/api/terms/:id', async (req, res) => {
    try {
        const db = await getDb();
        const doc = await col(db).findOne({ _id: req.params.id });
        if (!doc) return res.status(404).json({ error: 'Term not found' });
        res.json(normalize(doc));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/categories — unique categories
app.get('/api/categories', async (req, res) => {
    try {
        const db = await getDb();
        const cats = await db.collection(mongoConfig.categoriesCollectionName).find({}).toArray();
        // Return only the category names, sorted alphabetically
        const catNames = cats.map(c => c.name || c.category || c).sort();
        res.json(catNames);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
    try {
        const db = await getDb();
        const terms = await col(db).find({}, { projection: { category: 1 } }).toArray();
        const cats = await db.collection(mongoConfig.categoriesCollectionName).find({}).toArray();
        const categories = cats.map(c => c.name || c.category || c);
        res.json({
            totalTerms: terms.length,
            totalCategories: categories.length,
            categories: categories.map(cat => ({
                name: cat,
                count: terms.filter(t => t.category === cat).length
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/terms — add new term
app.post('/api/terms', async (req, res) => {
    try {
        const db = await getDb();
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
        await col(db).insertOne(doc);
        res.status(201).json(normalize(doc));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/terms/:id — update term
app.put('/api/terms/:id', async (req, res) => {
    try {
        const db = await getDb();
        const { id: _ignore, _id: _ignore2, ...fields } = req.body;
        const update = { ...fields, updatedAt: new Date().toISOString() };

        const doc = await col(db).findOneAndUpdate(
            { _id: req.params.id },
            { $set: update },
            { returnDocument: 'after' }
        );
        if (!doc) return res.status(404).json({ error: 'Term not found' });
        res.json(normalize(doc));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/terms/:id
app.delete('/api/terms/:id', async (req, res) => {
    try {
        const db = await getDb();
        const result = await col(db).deleteOne({ _id: req.params.id });
        if (!result.deletedCount) return res.status(404).json({ error: 'Term not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const db = await getDb();
        const user = await db.collection(mongoConfig.usersCollectionName).findOne({ username, password });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Generate a mock JWT
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
        const payload = Buffer.from(JSON.stringify({
            sub: username,
            role: 'admin',
            iat: Date.now(),
            exp: Date.now() + (24 * 60 * 60 * 1000)
        })).toString('base64');
        const signature = Buffer.from(`${header}.${payload}.mock-secret`).toString('base64');
        const token = `${header}.${payload}.${signature}`;

        res.json({ success: true, token, username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────

async function ensureAdminExists(db) {
    const users = db.collection(mongoConfig.usersCollectionName);
    const count = await users.countDocuments();
    if (count === 0) {
        await users.insertOne({ username: 'admin', password: 'admin123' });
        console.log('🌱 Seeded default admin user (admin / admin123) in MongoDB');
    }
}

app.listen(PORT, () => {
    console.log(`🚀 WebWiki running at http://localhost:${PORT}`);
    
    // Connect to DB in the background
    getDb().then(ensureAdminExists).catch(err => {
        console.error('⚠️ Could not connect to MongoDB on startup. Retrying on next request...', err.message);
    });
});
