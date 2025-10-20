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

import { env } from '@/env.mjs';

import { useHelpModal } from '../helpers/help-modal';

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
    const [membershipLoaded, setMembershipLoaded] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [feedbackUrl, setFeedbackUrl] = useState<string | undefined>();
    const router = useRouter();
    const pathname = usePathname();
    const openHelpModal = useHelpModal((s) => s.open);

    useEffect(() => {
        setMounted(true);
        setFeedbackUrl(env.NEXT_PUBLIC_FEEDBACK_FORM_URL);
    }, []);

    const isActive = (path: string) => pathname === path;

    const isAdmin = () => {
        if (!session?.accessToken) return false;
        try {
            const decodedToken = JSON.parse(atob(session.accessToken.split('.')[1]));
            return decodedToken?.realm_access?.roles.includes('myvote-admin');
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
                } finally {
                    setMembershipLoaded(true);
                }
            } else {
                setMembershipLoaded(true);
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
                isBordered={!isPaidMember || !membershipLoaded}
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
                        <Tooltip content="Help" size="sm">
                            <Button {...HEADER_BUTTON_PROPS} onPress={openHelpModal}>
                                ❓
                            </Button>
                        </Tooltip>
                    </NavbarItem>
                    {mounted && (
                        <NavbarItem>
                            <Tooltip content="Send Feedback" size="sm">
                                <Button
                                    {...HEADER_BUTTON_PROPS}
                                    as="a"
                                    href={feedbackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    🗣️
                                </Button>
                            </Tooltip>
                        </NavbarItem>
                    )}
                    <NavbarItem>
                        <Tooltip content="Toggle Dark Mode" size="sm">
                            <Button
                                {...HEADER_BUTTON_PROPS}
                                onPress={toggleTheme}
                                data-testid="theme-toggle"
                            >
                                {mounted ? (theme === 'dark' ? '🌚' : '🌞') : '🌞'}
                            </Button>
                        </Tooltip>
                    </NavbarItem>
                </NavbarContent>
            </Navbar>

            {/* Show tab bar only for paid members */}
            {membershipLoaded && isPaidMember && (
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
                            <Button
                                className={clsx({ 'bg-primary': isActive('/positions') })}
                                onPress={() => router.push('/positions')}
                            >
                                Positions
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
            <Button color="primary" size="sm" onPress={() => signOut({ callbackUrl: '/' })}>
                Logout
            </Button>
        </div>
    );
};

const NotLoggedInAuthButton = () => {
    return (
        <Button color="primary" size="sm" onPress={() => signIn('keycloak')}>
            Login
        </Button>
    );
};
