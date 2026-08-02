import type { Metadata } from "next";
import "./globals.css";
import {Providers} from './providers';

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
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
