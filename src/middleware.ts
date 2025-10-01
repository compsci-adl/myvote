import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';

const protectedRoutes = ['/voting', '/candidates', '/admin'];
// const publicRoutes = ['/', '/auth/signin', '/auth/error'];

export default async function middleware(request: NextRequest) {
    const session = await auth();
    const { pathname } = request.nextUrl;

    // Check if the current route is protected
    const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
    // const isPublicRoute = publicRoutes.includes(pathname);

    // If accessing a protected route without being authenticated
    if (isProtectedRoute && !session) {
        const signInUrl = new URL('/api/auth/signin', request.url);
        signInUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(signInUrl);
    }

    // If authenticated user tries to access sign-in page, redirect to voting
    if (session && pathname === '/auth/signin') {
        return NextResponse.redirect(new URL('/voting', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
