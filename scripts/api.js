// ============================================
// API Layer — HTTP client to Express/MongoDB backend
// ============================================
//
// All operations call the Express backend at /api/...
// The backend (server.js) connects to MongoDB Atlas using
// the config in scripts/db.js.
//
// To start the backend:   node server.js
// To seed the database:   node scripts/seed.js
// ============================================

const BASE = '/api';

async function request(path, options = {}) {
    let res;
    try {
        res = await fetch(`${BASE}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
    } catch (networkErr) {
        throw new Error(`Não foi possível conectar ao servidor. Verifique se ele está rodando (npm run dev). Detalhe: ${networkErr.message}`);
    }

    // Guard against non-JSON responses (HTML error pages, nginx errors, etc.)
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`O servidor retornou uma resposta inesperada (HTTP ${res.status}). Verifique o terminal do servidor.\n${text.slice(0, 200)}`);
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Requisição falhou (HTTP ${res.status})`);
    return data;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get all terms sorted alphabetically
 */
export async function getTerms() {
    return request('/terms');
}

/**
 * Get a single term by ID
 */
export async function getTerm(id) {
    return request(`/terms/${id}`);
}

/**
 * Search terms — results ordered by 3-tier priority (title > tags > body)
 */
export async function searchTerms(query) {
    const q = query?.trim() ?? '';
    if (!q) return request('/terms');
    return request(`/terms/search?q=${encodeURIComponent(q)}`);
}

/**
 * Get terms filtered by category
 */
export async function getTermsByCategory(category) {
    if (!category || category === 'All') return request('/terms');
    const terms = await request('/terms');
    return terms.filter(t => t.category === category);
}

/**
 * Get all unique categories
 */
export async function getCategories() {
    return request('/categories');
}

/**
 * Add a new term
 */
export async function addTerm(termData) {
    return request('/terms', {
        method: 'POST',
        body: JSON.stringify(termData),
    });
}

/**
 * Update an existing term
 */
export async function updateTerm(id, termData) {
    return request(`/terms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(termData),
    });
}

/**
 * Delete a term
 */
export async function deleteTerm(id) {
    return request(`/terms/${id}`, { method: 'DELETE' });
}

/**
 * Get stats about the dictionary
 */
export async function getStats() {
    return request('/stats');
}

/**
 * Login with backend
 */
export async function loginApi(username, password) {
    return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

/**
 * Simulate fetching a definition from an external API.
 * (Kept as a local simulation — wire to a real API if needed.)
 */
export async function fetchExternalDefinition(termName) {
    await new Promise(r => setTimeout(r, 500));

    const externalDB = {
        'CQRS': {
            term: 'CQRS (Command Query Responsibility Segregation)',
            shortDefinition: 'A pattern that separates read and write operations for a data store.',
            definition: 'CQRS (Command Query Responsibility Segregation) is a pattern that separates read and update operations for a data store. Using CQRS can maximize performance, scalability, and security. The flexibility created by migrating to CQRS allows a system to better evolve over time and prevents update commands from causing merge conflicts at the domain level.',
            category: 'Architecture',
            relatedTerms: ['DDD', 'Event Sourcing', 'Microservices']
        },
        'Event Sourcing': {
            term: 'Event Sourcing',
            shortDefinition: 'Storing state changes as a sequence of events rather than current state.',
            definition: 'Event Sourcing is a design pattern where state changes are stored as a sequence of events. Instead of storing just the current state of the data, this pattern stores the full series of actions taken on that data. The event store is the source of truth, and the current state can be derived by replaying events.',
            category: 'Architecture',
            relatedTerms: ['CQRS', 'DDD', 'Microservices']
        },
        'Monolith': {
            term: 'Monolithic Architecture',
            shortDefinition: 'A software architecture where all components are part of a single deployable unit.',
            definition: 'A monolithic architecture is a traditional model for software design where the entire application is built as a single, indivisible unit. All components share the same memory space, database, and codebase.',
            category: 'Architecture',
            relatedTerms: ['Microservices', 'Architecture', 'Scaling']
        },
        'E2E Testing': {
            term: 'End-to-End Testing (E2E)',
            shortDefinition: 'Testing the complete flow of an application from start to finish.',
            definition: 'End-to-End (E2E) testing is a methodology that tests the complete flow of an application from start to finish. It simulates real user scenarios to validate the system under test and its components for integration and data integrity.',
            category: 'Testing',
            relatedTerms: ['Integration Testing', 'Unit Testing', 'Selenium']
        },
        'Factory Pattern': {
            term: 'Factory Pattern',
            shortDefinition: 'A creational pattern that provides an interface for creating objects without specifying their concrete classes.',
            definition: 'The Factory Pattern is a creational design pattern that provides an interface for creating objects in a superclass, while allowing subclasses to alter the type of objects that will be created.',
            category: 'Design Patterns',
            relatedTerms: ['Design Patterns', 'Singleton Pattern', 'Abstract Factory']
        }
    };

    const result = externalDB[termName];
    if (result) return { success: true, data: result };
    return {
        success: false,
        error: `No external definition found for "${termName}". Try: ${Object.keys(externalDB).join(', ')}`
    };
}

/**
 * Reset — not applicable when using MongoDB.
 * Re-seed via: node scripts/seed.js
 */
export async function resetData() {
    console.warn('resetData() is not supported with MongoDB backend. Run: node scripts/seed.js');
    return getTerms();
}
