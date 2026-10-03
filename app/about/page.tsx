'use client';

import { BackButton, PageShell, PageHeader } from '../components/ui';
import { motion, PageMotion, fadeUp, smooth } from '../components/motion';

function Builder() {
  return (
    <motion.section variants={fadeUp} initial="hidden" animate="visible" transition={smooth}
      className="space-y-4 border border-surface-dark bg-surface-darker p-6">
      <h2 className="text-xl font-bold">Jason Poindexter</h2>
      <p className="text-sm leading-relaxed text-gray-300">I made Interrogation for a hackathon. It explores what happens when an AI has a story to defend and the player has to question it.</p>
      <p className="text-sm leading-relaxed text-gray-300">This edition is being rebuilt as a local demonstration: clearer evidence, recoverable interactions, modular code and a visible distinction between fictional acting and the facts of the case.</p>
    </motion.section>
  );
}

function BuilderLinks() {
  return (
    <nav aria-label="Builder profiles" className="mt-6 flex flex-wrap gap-4 text-sm">
      <a href="https://www.linkedin.com/in/jasonmpoindexter/" target="_blank" rel="noopener noreferrer"
        className="rounded-sm border border-surface bg-surface-darker px-4 py-3 text-gray-300 hover:text-white">LinkedIn</a>
      <a href="https://github.com/jpoindexter" target="_blank" rel="noopener noreferrer"
        className="rounded-sm border border-surface bg-surface-darker px-4 py-3 text-gray-300 hover:text-white">GitHub</a>
    </nav>
  );
}

export default function AboutPage() {
  return (
    <PageShell>
      <BackButton />
      <PageMotion>
        <main className="mx-auto max-w-3xl px-6 py-12">
          <PageHeader label="The builder" title="ABOUT" />
          <Builder />
          <BuilderLinks />
        </main>
      </PageMotion>
    </PageShell>
  );
}
