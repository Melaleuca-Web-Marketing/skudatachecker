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
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const baseHref = basePath ? `${basePath}/` : "";

  return (
    <html lang="en">
      <head>{baseHref ? <base href={baseHref} /> : null}</head>
      <body>{children}</body>
    </html>
  );
}
