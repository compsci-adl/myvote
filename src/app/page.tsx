'use client';

import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function WelcomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Check membership status and redirect when logged in
    useEffect(() => {
        const checkMembershipAndRedirect = async () => {
            if (session?.user?.id) {
                try {
                    // TODO: Implement fetcher call to check membership
                    // const response = await fetcher.get.query([`membership/${session.user.id}`]);

                    // For now, assume paid member and redirect to voting
                    router.push('/voting');

                    // if (response.status === 'Paid member') {
                    //   localStorage.setItem('student_id', response.student_id);
                    //   localStorage.setItem('full_name', response.full_name);
                    //   router.push('/voting');
                    // } else if (response.status === 'Unpaid member') {
                    //   alert('Please pay for your membership on the CS Club Website first. Then logout and login again.');
                    // } else {
                    //   alert('Please create an account on the CS Club Website first and pay for your membership. Then logout and login again.');
                    // }
                } catch (error) {
                    alert(
                        'Please create an account on the CS Club Website first and pay for your membership. Then logout and login again.'
                    );
                }
            }
        };

        if (status === 'authenticated') {
            checkMembershipAndRedirect();
        }
    }, [session, router, status]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <img src="/favicon.svg" alt="MyVote Logo" className="mb-4 h-24 w-24" />
            <h1 className="mb-4 text-4xl font-bold">Welcome to MyVote</h1>
            <p className="mb-8 text-lg">The Computer Science Club&apos;s new voting system!</p>
            {status === 'loading' ? (
                <p>Loading...</p>
            ) : session ? (
                <LoggedInAuthButton />
            ) : (
                <NotLoggedInAuthButton />
            )}
        </div>
    );
}

const LoggedInAuthButton = () => {
    return (
        <div className="flex items-center gap-2">
            <Button color="primary" size="lg" onPress={() => signOut({ callbackUrl: '/' })}>
                Logout
            </Button>
        </div>
    );
};

const NotLoggedInAuthButton = () => {
    return (
        <Button color="primary" size="lg" onPress={() => signIn('keycloak')}>
            Login
        </Button>
    );
};
