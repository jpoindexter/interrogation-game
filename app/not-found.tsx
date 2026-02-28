import Link from 'next/link';
import { PageMotion } from './components/motion';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-foreground font-mono flex items-center justify-center p-8">
      <PageMotion className="max-w-md text-center">
        <h1 className="text-6xl font-bold text-accent mb-2">404</h1>
        <p className="text-xl text-gray-400 mb-6">Case not found.</p>
        <Link href="/" className="px-6 py-3 bg-surface text-foreground font-bold rounded-sm hover:bg-surface-hover transition-colors inline-block">
          Back to HQ
        </Link>
      </PageMotion>
    </div>
  );
}
