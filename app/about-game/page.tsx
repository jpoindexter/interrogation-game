'use client';

import Link from 'next/link';
import { BackButton, PageShell, PageHeader } from '../components/ui';
import { motion, PageMotion, fadeUp, stagger, smooth } from '../components/motion';

const SECTIONS = [
  { title: 'A fictional account worth questioning', paragraphs: [
    'You are the detective. An AI plays a suspect with a cover story. Ask questions, keep track of what was said, and make a specific accusation supported by the case.',
    'The portrait, stress display and vocal delivery are dramatic effects. They are not evidence of guilt or a guide to reading real people.',
  ] },
  { title: 'Evidence has a source', paragraphs: [
    'In an evidence challenge, pin an exact recorded statement, choose a disclosed exhibit and ask how they fit together. Clarify, Present evidence and Leave space prepare editable questions; you decide what to send.',
    'A reviewed evidence graph determines whether that pair establishes a contradiction. The model supplies the suspect’s reply; it does not create an exhibit or award progress. Other generated cases still use their own clue rules.',
  ] },
  { title: 'Voice is optional', paragraphs: [
    'You can type throughout the game. Voice input and spoken replies use ElevenLabs when the server is configured for it. Microphone permission and provider availability can interrupt voice; use text to continue.',
    'Provider settings stay on the server. The configuration screen checks what is configured, without claiming a successful live model or voice call.',
  ] },
  { title: 'A hackathon project, being rebuilt', paragraphs: [
    'The original repository presented this as an entry for the Mistral Worldwide Hackathon 2026. That version used Mistral for dialogue and Voxtral for transcription.',
    'The current upgrade targets a local OpenAI/Codex demonstration with a separate server API path. Full gameplay and voice verification are tracked separately from source changes and automated checks.',
  ] },
  { title: 'What this project does not claim', paragraphs: [
    'Prompts and response validation reduce unwanted behavior; they do not guarantee that a model will never contradict itself or reveal a secret. Live scenarios must be tested.',
    'Transcripts can support evaluation, but exporting them does not automatically train a model. The game does not claim proven lie detection, real interrogation training or measured improvement from player tactics.',
  ] },
];

function GameSection({ title, paragraphs }: typeof SECTIONS[number]) {
  return (
    <motion.section variants={fadeUp} transition={smooth} className="mb-6 space-y-3 border border-surface-dark bg-surface-darker p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gold">{title}</h2>
      {paragraphs.map(paragraph => <p key={paragraph} className="text-sm leading-relaxed text-gray-300">{paragraph}</p>)}
    </motion.section>
  );
}

export default function AboutGamePage() {
  return (
    <PageShell>
      <BackButton />
      <PageMotion>
        <main className="mx-auto max-w-3xl px-6 py-12">
          <PageHeader label="Behind the scenes" title="ABOUT THE GAME" />
          <motion.div variants={stagger(0.08)} initial="hidden" animate="visible">
            {SECTIONS.map(section => <GameSection key={section.title} {...section} />)}
          </motion.div>
          <Link href="/help" className="text-sm text-gold underline underline-offset-4">Read the field manual</Link>
        </main>
      </PageMotion>
    </PageShell>
  );
}
