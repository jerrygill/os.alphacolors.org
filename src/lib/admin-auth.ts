import 'server-only';

import {createHash, timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';

export const ADMIN_COOKIE_NAME = 'alpha-colors-admin';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function digest(value: string): Buffer {
    return createHash('sha256').update(value).digest();
}

export function isAdminPassword(candidate: string): boolean {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return false;
    return timingSafeEqual(digest(candidate), digest(password));
}

export function getAdminSessionToken(): string | null {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return null;
    return createHash('sha256')
        .update(`alpha-colors-admin-session:${password}`)
        .digest('base64url');
}

export function isAdminSessionToken(candidate: string | undefined): boolean {
    const expected = getAdminSessionToken();
    if (!candidate || !expected) return false;
    return timingSafeEqual(digest(candidate), digest(expected));
}

export async function hasAdminSession(): Promise<boolean> {
    const cookieStore = await cookies();
    return isAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export async function requireAdmin(): Promise<void> {
    if (!(await hasAdminSession())) redirect('/admin/login');
}
