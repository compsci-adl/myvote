import '@/styles/globals.css';

import { clsx } from 'clsx';
import { Metadata, Viewport } from 'next';
import Script from 'next/script';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { fontSans } from '@/config/fonts';
import { siteConfig } from '@/config/site';
import { env } from '@/env.mjs';

import { FirstTimeHelpClient } from '../components/FirstTimeHelpClient';
import { HelpModal } from '../components/HelpModal';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: {
        default: siteConfig.name,
        template: `%s - ${siteConfig.name}`,
    },
    description: siteConfig.description,
    icons: {
        icon: '/favicon.ico',
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: 'white' },
        { media: '(prefers-color-scheme: dark)', color: 'black' },
    ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html suppressHydrationWarning lang="en">
            <Script
                defer
                src="https://umami.csclub.org.au/script.js"
                data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            />
            <body
                className={clsx(
                    'text-foreground bg-background min-h-screen font-sans antialiased',
                    fontSans.variable
                )}
            >
                <Providers themeProps={{ attribute: 'class', defaultTheme: 'light' }}>
                    <Header />
                    <main className="mx-auto max-w-screen-xl space-y-4 px-2 py-4">
                        <FirstTimeHelpClient />
                        <HelpModal />
                        {children}
                        <Footer />
                    </main>
                </Providers>
            </body>
        </html>
    );
}
