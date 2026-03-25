// POST /api/auth/login

import { getDb, col } from '../_db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { username, password } = req.body;
        const db = await getDb();
        const user = await col(db, 'users').findOne({ username, password });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate a mock JWT (same as original server.js — replace with a real JWT lib if needed)
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
        const payload = Buffer.from(JSON.stringify({
            sub: username,
            role: 'admin',
            iat: Date.now(),
            exp: Date.now() + (24 * 60 * 60 * 1000),
        })).toString('base64');
        const signature = Buffer.from(`${header}.${payload}.mock-secret`).toString('base64');
        const token = `${header}.${payload}.${signature}`;

        return res.json({ success: true, token, username });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
