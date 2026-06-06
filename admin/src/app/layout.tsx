import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grahachara Marketing Studio',
  description: 'Generate marketing reels for TikTok, Instagram & Facebook',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
