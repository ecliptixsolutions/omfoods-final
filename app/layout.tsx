import type { Metadata } from "next";
import "./globals.css";
import {siteUrl} from './site-url';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {default:"OM Food and Spices LLP | Onion & Garlic Ingredients",template:"%s | OM Food and Spices LLP"},
  description: "Dehydrated onion and garlic ingredients for food manufacturers and bulk buyers. Explore products, applications and enquiries with OM Food and Spices LLP, Gujarat, India.",
  icons: {
    icon: "/om-icon.svg",
    shortcut: "/om-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
