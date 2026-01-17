import type { Metadata } from "next";
import "./globals.css";

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
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
