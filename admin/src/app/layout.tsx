import type { Metadata } from 'next';
import {
  Fraunces, Inter, JetBrains_Mono,
  Playfair_Display, Cormorant_Garamond, Cinzel, Lora,
  Montserrat, Poppins, Oswald, Archivo_Black, Dancing_Script,
} from 'next/font/google';
import './globals.css';
import AuthGate from '@/components/AuthGate';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

// Post-builder typography library (preload off — they load when picked).
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-playfair', display: 'swap', preload: false });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-cormorant', display: 'swap', preload: false });
const cinzel = Cinzel({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-cinzel', display: 'swap', preload: false });
const lora = Lora({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-lora', display: 'swap', preload: false });
const montserrat = Montserrat({ subsets: ['latin'], weight: ['600', '800'], variable: '--font-montserrat', display: 'swap', preload: false });
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-poppins', display: 'swap', preload: false });
const oswald = Oswald({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-oswald', display: 'swap', preload: false });
const archivoBlack = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-black', display: 'swap', preload: false });
const dancing = Dancing_Script({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-script', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: 'Grahachara Studio',
  description: 'Content studio — video reels, image posts and copy from real ephemeris data',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [
    fraunces.variable, inter.variable, jetbrains.variable,
    playfair.variable, cormorant.variable, cinzel.variable, lora.variable,
    montserrat.variable, poppins.variable, oswald.variable, archivoBlack.variable, dancing.variable,
  ].join(' ');

  return (
    <html lang="en" className={fontVars}>
      <body className="font-sans antialiased">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
