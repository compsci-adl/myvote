import { Fira_Code as FontMono, Outfit as FontSans } from 'next/font/google';

export const fontSans = FontSans({
    subsets: ['latin'],
    variable: '--font-sans',
});

export const fontMono = FontMono({
    subsets: ['latin'],
    variable: '--font-mono',
});
