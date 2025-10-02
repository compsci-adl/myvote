'use client';

import {
    Button,
    ButtonGroup,
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    Tooltip,
} from '@heroui/react';
import { clsx } from 'clsx';
import { usePathname, useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

// TODO: Import fetcher when migrated
// import { fetcher } from '../lib/fetcher';

const HEADER_BUTTON_PROPS = {
    size: 'sm',
    isIconOnly: true,
    variant: 'flat',
    color: 'primary',
    className: 'text-xl',
} as const;

export const Header = () => {
    const { theme, setTheme } = useTheme();
    const { data: session, status } = useSession();
    const [isPaidMember, setIsPaidMember] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // Handle hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    const isActive = (path: string) => pathname === path;

    const isAdmin = () => {
        if (!session?.accessToken) return false;
        try {
            const decodedToken = JSON.parse(atob(session.accessToken.split('.')[1]));
            return decodedToken?.realm_access?.roles.includes('admin');
        } catch {
            return false;
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // Fetch membership status when user logs in
    useEffect(() => {
        const fetchMembershipStatus = async () => {
            if (session?.user?.id) {
                try {
                    const { fetcher } = await import('../lib/fetcher');
                    const response = await fetcher.post.query([
                        'validate-member',
                        {
                            json: { keycloak_id: session.user.id },
                        },
                    ]);
                    // If response has ok: true, user is a paid member
                    setIsPaidMember(
                        Boolean(
                            response &&
                                typeof response === 'object' &&
                                'ok' in response &&
                                response.ok === true
                        )
                    );
                } catch {
                    setIsPaidMember(false);
                }
            }
        };

        fetchMembershipStatus();
    }, [session]);

    return (
        <div className="flex h-full flex-col">
            <Navbar
                maxWidth="xl"
                position="static"
                classNames={{ wrapper: 'px-4' }}
                {...(isPaidMember ? {} : { isBordered: true })}
            >
                <NavbarBrand>
                    <img src="/favicon.svg" alt="Logo" className="mr-2 w-6" />
                    <h1 className="font-bold text-inherit">MyVote</h1>
                </NavbarBrand>

                <NavbarContent justify="end" className="flex items-center gap-4">
                    {status === 'authenticated' ? (
                        <LoggedInAuthButton />
                    ) : (
                        <NotLoggedInAuthButton />
                    )}

                    <NavbarItem>
                        <Tooltip content="Toggle Dark Mode" size="sm">
                            <Button {...HEADER_BUTTON_PROPS} onPress={toggleTheme}>
                                {mounted ? (theme === 'dark' ? '🌚' : '🌞') : '🌞'}
                            </Button>
                        </Tooltip>
                    </NavbarItem>
                </NavbarContent>
            </Navbar>

            {/* Show tab bar only for paid members */}
            {isPaidMember && (
                <Navbar isBordered maxWidth="xl" position="static" classNames={{ wrapper: 'px-4' }}>
                    <NavbarContent justify="center" className="w-full">
                        <ButtonGroup className="mx-auto">
                            <Button
                                className={clsx({ 'bg-primary': isActive('/voting') })}
                                onPress={() => router.push('/voting')}
                            >
                                Voting
                            </Button>
                            <Button
                                className={clsx({ 'bg-primary': isActive('/candidates') })}
                                onPress={() => router.push('/candidates')}
                            >
                                Candidates
                            </Button>
                            {isAdmin() && (
                                <Button
                                    className={clsx({ 'bg-primary': isActive('/admin') })}
                                    onPress={() => router.push('/admin')}
                                >
                                    Admin
                                </Button>
                            )}
                        </ButtonGroup>
                    </NavbarContent>
                </Navbar>
            )}
        </div>
    );
};

const LoggedInAuthButton = () => {
    return (
        <div className="flex items-center gap-2">
            <Button color="primary" size="md" onPress={() => signOut({ callbackUrl: '/' })}>
                Logout
            </Button>
        </div>
    );
};

const NotLoggedInAuthButton = () => {
    return (
        <Button color="primary" size="md" onPress={() => signIn('keycloak')}>
            Login
        </Button>
    );
};
