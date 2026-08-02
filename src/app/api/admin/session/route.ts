import {NextRequest, NextResponse} from 'next/server';
import {
    ADMIN_COOKIE_NAME,
    ADMIN_SESSION_MAX_AGE,
    getAdminSessionToken,
    hasAdminSession,
    isAdminPassword,
} from '@/lib/admin-auth';

export async function GET() {
    return NextResponse.json({authenticated: await hasAdminSession()});
}

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null) as {password?: unknown} | null;
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!process.env.ADMIN_PASSWORD) {
        return NextResponse.json({error: 'Admin password is not configured.'}, {status: 503});
    }

    if (!isAdminPassword(password)) {
        return NextResponse.json({error: 'Incorrect password.'}, {status: 401});
    }

    const token = getAdminSessionToken();
    if (!token) {
        return NextResponse.json({error: 'Admin session is unavailable.'}, {status: 503});
    }

    const response = NextResponse.json({authenticated: true});
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return response;
}

export async function DELETE() {
    const response = NextResponse.json({authenticated: false});
    response.cookies.set(ADMIN_COOKIE_NAME, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
    return response;
}
