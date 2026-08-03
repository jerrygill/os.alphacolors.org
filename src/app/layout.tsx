import type { Metadata } from "next";
import {Barlow, Barlow_Condensed} from 'next/font/google';
import "./globals.css";
import {Providers} from './providers';

const bodyFont = Barlow({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-alpha-body',
    display: 'swap',
});

const displayFont = Barlow_Condensed({
    subsets: ['latin'],
    weight: ['500', '600', '700', '800'],
    variable: '--font-alpha-display',
    display: 'swap',
});

export const metadata: Metadata = {
    title: "Order of Service | Alpha Colors Church",
    description: "Church Order of Service for Alpha Colors",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
