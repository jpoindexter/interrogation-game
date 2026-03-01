import type { Metadata } from 'next';
import { JetBrains_Mono, Press_Start_2P, Gloria_Hallelujah } from 'next/font/google';
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/700.css';
import './globals.css';
import FontProvider from './components/FontProvider';

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
});

const handwriting = Gloria_Hallelujah({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-handwriting',
});

export const metadata: Metadata = {
  title: 'Interrogation — Voice Detective Game',
  description: 'A voice-based detective game powered by Mistral AI. Interrogate suspects, catch lies, crack the case.',
  openGraph: {
    title: 'Interrogation — Voice Detective Game',
    description: 'Mistral can reason. I made it lie. Your job is to catch it.',
    type: 'website',
    siteName: 'Interrogation',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Interrogation — Voice Detective Game',
    description: 'Mistral can reason. I made it lie. Your job is to catch it.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jetBrainsMono.variable} ${pressStart2P.variable} ${handwriting.variable} font-sans`}>
      <body className="bg-black text-foreground">
        <FontProvider />
        {children}
      </body>
    </html>
  );
}
