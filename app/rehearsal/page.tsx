import type { Metadata } from 'next';
import Walkthrough from './Walkthrough';

export const metadata: Metadata = {
  title: 'Recorded walkthrough — Interrogation',
  description: 'A clearly labeled, read-only replay of a saved interrogation run. No live AI interaction.',
  robots: { index: false, follow: false },
};

export default function RehearsalPage() { return <Walkthrough />; }
