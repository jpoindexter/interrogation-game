import type { Metadata } from 'next';
import { JetBrains_Mono, Press_Start_2P } from 'next/font/google';
import '@fontsource/opendyslexic/400.css';
import '@fontsource/opendyslexic/700.css';
import './globals.css';

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

const pressStart2P = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
});

export const metadata: Metadata = {
  title: 'Interrogation - Voice Detective Game',
  description: 'A voice-based detective game where you interrogate an AI suspect',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jetBrainsMono.variable} ${pressStart2P.variable} font-sans`}>
      <body className="bg-black text-[#E8E8E8]">
        {children}
      </body>
    </html>
  );
}