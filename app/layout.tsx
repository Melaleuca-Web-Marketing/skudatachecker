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
  const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/skudatachecker").replace(/\/$/, "");
  const baseHref = `${bp}/`;

  return (
    <html lang="en">
      <head>
        <base href={baseHref} />
      </head>
      <body>{children}</body>
    </html>
  );
}
