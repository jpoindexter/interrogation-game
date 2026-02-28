import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
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
    <html lang="en" className={`${jetBrainsMono.variable} font-sans`}>
      <body className="bg-[#0A0A0A] text-[#E8E8E8]">
        {children}
      </body>
    </html>
  );
}