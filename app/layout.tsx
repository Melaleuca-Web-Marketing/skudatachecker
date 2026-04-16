import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SKU Validation Dashboard',
  description: 'Validate SKU data with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
  const bp = rawBasePath ? rawBasePath.replace(/\/$/, "") : "";
  const baseHref = bp ? `${bp}/` : null;

  return (
    <html lang="en">
      <head>{baseHref ? <base href={baseHref} /> : null}</head>
      <body>{children}</body>
    </html>
  );
}
