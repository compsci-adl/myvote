import Footer from "@/components/Footer";
import Header from "@/components/Header";
// import { env } from '@/env.mjs';
import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
// import { SessionProvider } from 'next-auth/react';
// import Script from 'next/script';

export const metadata: Metadata = {
      icons: "/favicon.ico",
      title: {
            template: "%s | MyVote",
            default: "MyVote"
      },
      description:
            "MyVote is the Computer Science Club's new voting system, designed for user-friendly, secure, and transparent elections"
};

export default function RootLayout({ children }: RootLayoutProps) {
      return (
            // <SessionProvider>
            <html lang="en">
                  {/* <Script
                    defer
                    src="https://umami.csclub.org.au/script.js"
                    data-website-id={env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
                /> */}
                  <body id="root">
                        <Header />
                        {children}
                        <Footer />
                  </body>
            </html>
            // </SessionProvider>
      );
}
