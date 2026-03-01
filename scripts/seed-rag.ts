/**
 * Seed the RAG database with realistic winning interrogation patterns.
 * Run: npx tsx scripts/seed-rag.ts
 */
import { Mistral } from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function embedOne(text: string): Promise<number[]> {
  const res = await mistral.embeddings.create({ model: 'mistral-embed', inputs: [text] });
  return res.data[0].embedding as number[];
}

interface SeedPattern {
  setting: string;
  difficulty: string;
  outcome: string;
  questions: string[];
  effective_questions: string[];
  max_stress: number;
  clues_found: number;
  time_elapsed: number;
}

const PATTERNS: SeedPattern[] = [
  // TECH STARTUP — wins across difficulties
  {
    setting: 'tech startup', difficulty: 'easy', outcome: 'win',
    questions: ['What exactly were you working on that night?', 'Who else was in the office?', 'Can you walk me through the timeline?', 'Why does the access log show you entered the server room at 2am?'],
    effective_questions: ['Why does the access log show you entered the server room at 2am?', 'Can you walk me through the timeline?'],
    max_stress: 8, clues_found: 2, time_elapsed: 150,
  },
  {
    setting: 'tech startup', difficulty: 'medium', outcome: 'win',
    questions: ['Tell me about the code deployment that night', 'Who had root access to production?', 'The git logs show a force push at 1:47am — was that you?', 'Why did you delete the branch history?', 'Your badge was scanned at the east entrance but you said you came in the front — explain that'],
    effective_questions: ['The git logs show a force push at 1:47am — was that you?', 'Why did you delete the branch history?', 'Your badge was scanned at the east entrance but you said you came in the front — explain that'],
    max_stress: 7, clues_found: 3, time_elapsed: 280,
  },
  {
    setting: 'tech startup', difficulty: 'hard', outcome: 'win',
    questions: ['Walk me through your entire evening hour by hour', 'Who approved the emergency deploy?', 'The monitoring dashboard shows someone disabled alerts at 11:30pm', 'Your VPN logs show you connected from a different IP than your home', 'I checked with your neighbor — they say your car was gone until 3am', 'Why would the backup timestamps not match the restore point you described?'],
    effective_questions: ['The monitoring dashboard shows someone disabled alerts at 11:30pm', 'Your VPN logs show you connected from a different IP than your home', 'Why would the backup timestamps not match the restore point you described?'],
    max_stress: 8, clues_found: 4, time_elapsed: 400,
  },
  // BANK / TRADING FLOOR
  {
    setting: 'bank', difficulty: 'medium', outcome: 'win',
    questions: ['What trades did you execute that afternoon?', 'Who authorized the wire transfer?', 'The compliance report flags your account for after-hours activity', 'Why is there a 15-minute gap in your transaction log?', 'Your colleague says you asked them to cover for you — is that true?'],
    effective_questions: ['Why is there a 15-minute gap in your transaction log?', 'Your colleague says you asked them to cover for you — is that true?', 'The compliance report flags your account for after-hours activity'],
    max_stress: 7, clues_found: 3, time_elapsed: 310,
  },
  {
    setting: 'trading floor', difficulty: 'hard', outcome: 'win',
    questions: ['Show me your positions from last Thursday', 'The clearing house flagged an anomaly in your book', 'Why did you switch to a personal device at 3:15?', 'Your assistant says you told her to shred documents — true?', 'The timestamps on your trade confirmations were manually altered', 'Who else knew about the position before the announcement?'],
    effective_questions: ['The timestamps on your trade confirmations were manually altered', 'Your assistant says you told her to shred documents — true?', 'Why did you switch to a personal device at 3:15?'],
    max_stress: 8, clues_found: 4, time_elapsed: 420,
  },
  // HOSPITAL
  {
    setting: 'hospital', difficulty: 'easy', outcome: 'win',
    questions: ['Were you on shift that night?', 'Who had access to the medication cabinet?', 'The pharmacy log shows an extra checkout under your ID at 11pm'],
    effective_questions: ['The pharmacy log shows an extra checkout under your ID at 11pm'],
    max_stress: 7, clues_found: 2, time_elapsed: 120,
  },
  {
    setting: 'hospital', difficulty: 'medium', outcome: 'win',
    questions: ['Walk me through patient rounds that evening', 'Who else was on the floor between 10pm and midnight?', 'The controlled substance count is off by three doses', 'Your badge shows you accessed the pharmacy twice but you only logged one visit', 'Why did you change your charting notes after the incident?'],
    effective_questions: ['Your badge shows you accessed the pharmacy twice but you only logged one visit', 'Why did you change your charting notes after the incident?', 'The controlled substance count is off by three doses'],
    max_stress: 7, clues_found: 3, time_elapsed: 290,
  },
  // LAW FIRM
  {
    setting: 'law firm', difficulty: 'medium', outcome: 'win',
    questions: ['Who had access to the client files?', 'When was the last time you accessed the Patterson case?', 'The billing system shows you logged 6 hours to a closed case', 'Your paralegal says you asked for sealed documents — why?', 'The metadata on the leaked document traces back to your workstation'],
    effective_questions: ['The metadata on the leaked document traces back to your workstation', 'The billing system shows you logged 6 hours to a closed case'],
    max_stress: 7, clues_found: 3, time_elapsed: 260,
  },
  {
    setting: 'law firm', difficulty: 'expert', outcome: 'win',
    questions: ['Tell me about your relationship with opposing counsel', 'The conflict check shows a connection you failed to disclose', 'Your personal email was found in the discovery documents', 'Why did you waive privilege on those specific documents?', 'The billing partner says your hours dont match the case timeline', 'Your secretary says you had a meeting with the plaintiff that wasnt on your calendar', 'The document management system shows you accessed files at 2am from an unknown device'],
    effective_questions: ['The conflict check shows a connection you failed to disclose', 'Your personal email was found in the discovery documents', 'The document management system shows you accessed files at 2am from an unknown device', 'Your secretary says you had a meeting with the plaintiff that wasnt on your calendar'],
    max_stress: 9, clues_found: 5, time_elapsed: 520,
  },
  // POLICE STATION
  {
    setting: 'police station', difficulty: 'medium', outcome: 'win',
    questions: ['Where were you during the evidence processing?', 'The chain of custody form has a gap between 4pm and 6pm', 'Your partner says you went to the evidence room alone — is that standard?', 'Body cam footage shows you near the lockup at an odd time', 'Why does the evidence weight not match the booking sheet?'],
    effective_questions: ['The chain of custody form has a gap between 4pm and 6pm', 'Why does the evidence weight not match the booking sheet?', 'Body cam footage shows you near the lockup at an odd time'],
    max_stress: 7, clues_found: 3, time_elapsed: 300,
  },
  // SERVER ROOM
  {
    setting: 'server room', difficulty: 'hard', outcome: 'win',
    questions: ['What maintenance were you performing on rack 7?', 'The environmental sensors show the room was accessed after hours', 'Why were the security cameras in that section down for exactly 20 minutes?', 'The network logs show a large data transfer to an external IP', 'Your keycard was used but the biometric scanner shows a different fingerprint', 'IT says you requested elevated privileges the day before the breach'],
    effective_questions: ['Why were the security cameras in that section down for exactly 20 minutes?', 'The network logs show a large data transfer to an external IP', 'IT says you requested elevated privileges the day before the breach'],
    max_stress: 8, clues_found: 4, time_elapsed: 380,
  },
  // CORPORATE OFFICE
  {
    setting: 'corporate office', difficulty: 'medium', outcome: 'win',
    questions: ['What was the nature of your meeting with the CFO?', 'The expense report has charges from a restaurant you said you never visited', 'Your calendar was cleared for the afternoon but your laptop was active', 'Why did you cc your personal email on company financials?', 'HR has a complaint about you pressuring a colleague to change their report'],
    effective_questions: ['The expense report has charges from a restaurant you said you never visited', 'Why did you cc your personal email on company financials?'],
    max_stress: 7, clues_found: 3, time_elapsed: 270,
  },
  // More expert-level wins
  {
    setting: 'tech startup', difficulty: 'expert', outcome: 'win',
    questions: ['I need to understand the full deployment pipeline', 'Who had SSH keys to production?', 'The CDN logs show a cache purge that wasnt in any runbook', 'Your commit messages reference a ticket that doesnt exist', 'We found a cron job that runs every night at 2am — what does it do?', 'The database has a shadow table with copies of deleted records', 'Your personal GitHub has a private repo with code matching the proprietary algorithm', 'Why does the AWS bill show an EC2 instance in a region you dont operate in?'],
    effective_questions: ['The database has a shadow table with copies of deleted records', 'Your personal GitHub has a private repo with code matching the proprietary algorithm', 'Why does the AWS bill show an EC2 instance in a region you dont operate in?', 'Your commit messages reference a ticket that doesnt exist'],
    max_stress: 9, clues_found: 5, time_elapsed: 550,
  },
  // Some losses to give balanced data
  {
    setting: 'tech startup', difficulty: 'hard', outcome: 'lose_time',
    questions: ['What were you doing that night?', 'Tell me about the project', 'Who do you work with?', 'Did anything unusual happen?'],
    effective_questions: [],
    max_stress: 3, clues_found: 1, time_elapsed: 540,
  },
  {
    setting: 'hospital', difficulty: 'expert', outcome: 'lose_accusations',
    questions: ['Did you do it?', 'I know youre lying', 'Just tell me the truth', 'You seem nervous', 'Confess now'],
    effective_questions: [],
    max_stress: 2, clues_found: 0, time_elapsed: 180,
  },
];

async function seed() {
  console.log(`Seeding ${PATTERNS.length} patterns...`);
  let success = 0;

  for (let i = 0; i < PATTERNS.length; i++) {
    const p = PATTERNS[i];
    const summary = [
      `Setting: ${p.setting}`,
      `Difficulty: ${p.difficulty}`,
      `Outcome: ${p.outcome}`,
      `Questions asked: ${p.questions.join(' | ')}`,
      p.effective_questions.length > 0 ? `Effective questions: ${p.effective_questions.join(' | ')}` : '',
      `Max stress reached: ${p.max_stress}/9`,
      `Clues found: ${p.clues_found}`,
    ].filter(Boolean).join('\n');

    try {
      const embedding = await embedOne(summary);
      const { error } = await supabase.from('interrogation_patterns').insert({
        session_id: `seed-${i}-${Date.now()}`,
        setting: p.setting,
        difficulty: p.difficulty,
        outcome: p.outcome,
        questions: p.questions,
        effective_questions: p.effective_questions,
        max_stress: p.max_stress,
        clues_found: p.clues_found,
        time_elapsed: p.time_elapsed,
        embedding: JSON.stringify(embedding),
      });
      if (error) { console.error(`  [${i}] Insert failed:`, error.message); continue; }
      success++;
      console.log(`  [${i}] ✓ ${p.setting} / ${p.difficulty} / ${p.outcome}`);
    } catch (err) {
      console.error(`  [${i}] Embedding failed:`, (err as Error).message);
    }
    // Small delay to avoid rate limits
    if (i > 0 && i % 5 === 0) await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone: ${success}/${PATTERNS.length} patterns seeded.`);
}

seed().catch(console.error);
