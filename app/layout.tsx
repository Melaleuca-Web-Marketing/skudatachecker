import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SKU Data Checker',
  description: 'Validate SKU data with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
