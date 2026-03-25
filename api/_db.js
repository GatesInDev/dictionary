// ============================================
// Shared DB helper — Vercel Serverless Functions
// ============================================
// Uses MONGODB_URI env var (set in Vercel project settings).
// Connection is cached across warm invocations.

import { MongoClient } from 'mongodb';

const DB_NAME = 'webwiki';
const COLLECTIONS = {
    terms: 'terms',
    categories: 'categories',
    users: 'users',
};

let _client;
let _db;

export async function getDb() {
    if (_db) return _db;

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is not set.');

    _client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
    });
    await _client.connect();
    _db = _client.db(DB_NAME);
    return _db;
}

export function col(db, name) {
    return db.collection(COLLECTIONS[name]);
}

/** Map a MongoDB doc to the shape the frontend expects */
export function normalize(doc) {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: String(_id), ...rest };
}

export const COLS = COLLECTIONS;
