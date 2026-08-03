import 'server-only';

import {createHash, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {getDatabase} from './db';

export const ADMIN_COOKIE_NAME = 'alpha-colors-admin';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type Database = NonNullable<ReturnType<typeof getDatabase>>;

interface AdminAuthRecord extends Record<string, unknown> {
    password_salt: string;
    password_hash: string;
    session_secret: string;
}

export interface AdminAuthenticationResult {
    configured: boolean;
    authenticated: boolean;
    sessionToken: string | null;
}

const scrypt = promisify(scryptCallback);

function digest(value: string): Buffer {
    return createHash('sha256').update(value).digest();
}

async function ensureAdminAuthTable(sql: Database): Promise<void> {
    await sql`
        CREATE TABLE IF NOT EXISTS os_admin_auth (
            singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
            password_salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            session_secret TEXT NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;
}

async function getAdminAuthRecord(): Promise<AdminAuthRecord | null> {
    const sql = getDatabase();
    if (!sql) return null;

    await ensureAdminAuthTable(sql);
    const rows = await sql`
        SELECT password_salt, password_hash, session_secret
        FROM os_admin_auth
        WHERE singleton = TRUE
        LIMIT 1;
    `;
    return rows[0] ? rows[0] as AdminAuthRecord : null;
}

async function derivePasswordHash(password: string, salt: string): Promise<Buffer> {
    return await scrypt(password, salt, 32) as Buffer;
}

function getSessionToken(record: AdminAuthRecord): string {
    return createHash('sha256')
        .update(`alpha-colors-admin-session:${record.session_secret}`)
        .digest('base64url');
}

export async function authenticateAdminPassword(candidate: string): Promise<AdminAuthenticationResult> {
    const record = await getAdminAuthRecord();
    if (!record) {
        return {configured: false, authenticated: false, sessionToken: null};
    }

    const expected = Buffer.from(record.password_hash, 'hex');
    const actual = await derivePasswordHash(candidate, record.password_salt);
    const authenticated = expected.length === actual.length && timingSafeEqual(actual, expected);

    return {
        configured: true,
        authenticated,
        sessionToken: authenticated ? getSessionToken(record) : null,
    };
}

export async function hasAdminSession(): Promise<boolean> {
    const cookieStore = await cookies();
    const candidate = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!candidate) return false;

    const record = await getAdminAuthRecord();
    if (!record) return false;
    return timingSafeEqual(digest(candidate), digest(getSessionToken(record)));
}

export async function requireAdmin(): Promise<void> {
    if (!(await hasAdminSession())) redirect('/admin/login');
}
