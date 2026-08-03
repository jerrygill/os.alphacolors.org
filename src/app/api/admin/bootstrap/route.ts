import {NextRequest, NextResponse} from 'next/server';
import {authenticateAdminPassword, initializeAdminPassword} from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null) as {password?: unknown} | null;
    const password = typeof body?.password === 'string' ? body.password : '';
    if (!password) return NextResponse.json({error: 'Password is required.'}, {status: 400});

    const existing = await authenticateAdminPassword(password);
    if (existing.configured) {
        return NextResponse.json(
            {configured: true, authenticated: existing.authenticated},
            {status: existing.authenticated ? 200 : 409},
        );
    }

    const initialized = await initializeAdminPassword(password);
    if (!initialized.authenticated) {
        return NextResponse.json({error: 'Unable to initialize admin access.'}, {status: 503});
    }
    return NextResponse.json({configured: true, authenticated: true}, {status: 201});
}
