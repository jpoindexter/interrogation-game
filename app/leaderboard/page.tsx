'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackButton, PageShell, PageHeader, Spinner } from '../components/ui';
import { SEED_ENTRIES, type LeaderboardEntry } from '../data/leaderboard-seeds';
import { formatTime } from '../game/components/utils';
import {
  motion,
  PageMotion,
  fadeIn,
  fadeUp,
  fadeDown,
  stagger,
  smooth,
} from '../components/motion';

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlayerInitials, setNewPlayerInitials] = useState<string | null>(null);

  useEffect(() => {
    // Check if we just came from win screen with a new entry
    const newEntry = sessionStorage.getItem('newLeaderboardEntry');
    if (newEntry) {
      setNewPlayerInitials(newEntry);
      sessionStorage.removeItem('newLeaderboardEntry');
    }

    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        const real = data.leaderboard ?? [];
        const merged = [...real, ...SEED_ENTRIES]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        setEntries(merged);
        setLoading(false);
      })
      .catch(() => {
        setEntries(SEED_ENTRIES);
        setLoading(false);
      });
  }, []);

  const ratingColor = (rating: string) => {
    if (rating === 'Legendary') return 'text-gold';
    if (rating === 'Veteran') return 'text-accent';
    if (rating === 'Sharp') return 'text-foreground';
    return 'text-gray-500';
  };

  const rankBadge = (i: number) => {
    if (i === 0) return { label: '1ST', color: 'text-gold' };
    if (i === 1) return { label: '2ND', color: 'text-gray-300' };
    if (i === 2) return { label: '3RD', color: 'text-bronze' };
    return { label: `${i + 1}`, color: 'text-gray-600' };
  };

  return (
    <PageShell>
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={smooth}>
        <BackButton />
      </motion.div>
      <PageMotion>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <PageHeader label="Hall of Records" title="LEADERBOARD" />

          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-2">No cases solved yet.</p>
              <p className="text-gray-600 text-sm">Crack your first suspect to get on the board.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <motion.div
                className="grid grid-cols-[40px_50px_1fr_100px_80px_80px] gap-3 px-4 py-2 text-xs uppercase tracking-wider text-gray-600"
                variants={fadeDown}
                initial="hidden"
                animate="visible"
                transition={smooth}
              >
                <span>#</span>
                <span>Player</span>
                <span>Case</span>
                <span className="text-right">Score</span>
                <span className="text-right">Time</span>
                <span className="text-right">Rating</span>
              </motion.div>

              <motion.div
                className="space-y-2"
                variants={stagger(0.06)}
                initial="hidden"
                animate="visible"
              >
                {entries.map((entry, i) => {
                  const rank = rankBadge(i);
                  // Detect if this is the player's new entry
                  const isNewEntry = newPlayerInitials &&
                    entry.player_name.slice(0, 3).toUpperCase() === newPlayerInitials.toUpperCase() &&
                    // Match the first occurrence only
                    entries.findIndex(e => e.player_name.slice(0, 3).toUpperCase() === newPlayerInitials!.toUpperCase()) === i;

                  return (
                    <motion.div
                      key={i}
                      variants={isNewEntry ? undefined : fadeUp}
                      initial={isNewEntry ? { opacity: 0, y: -60, scale: 1.08 } : undefined}
                      animate={isNewEntry ? { opacity: 1, y: 0, scale: 1 } : undefined}
                      transition={isNewEntry
                        ? { type: 'spring', stiffness: 180, damping: 14, delay: 0.4 + i * 0.06 }
                        : smooth
                      }
                      whileHover={{ scale: 1.01, backgroundColor: isNewEntry ? 'rgba(200, 160, 80, 0.15)' : 'rgba(255, 255, 255, 0.03)' }}
                      className={`relative grid grid-cols-[40px_50px_1fr_100px_80px_80px] gap-3 items-center px-4 py-3 rounded-sm border cursor-default transition-colors ${
                        isNewEntry
                          ? 'border-gold/50 bg-gold/10'
                          : i === 0
                            ? 'border-gold/30 bg-gold/5'
                            : i < 3
                              ? 'border-surface bg-surface-dark hover:border-gray-600'
                              : 'border-surface-dark bg-surface-darker hover:border-surface'
                      }`}
                    >
                      {/* Gold glow pulse on new entry */}
                      {isNewEntry && (
                        <motion.div
                          className="absolute inset-0 rounded-sm border-2 border-gold/60 pointer-events-none"
                          initial={{ opacity: 1 }}
                          animate={{ opacity: [1, 0.3, 1, 0.3, 0] }}
                          transition={{ duration: 2, delay: 0.8 + i * 0.06, ease: 'easeOut' }}
                        />
                      )}

                      {/* NEW badge */}
                      {isNewEntry && (
                        <motion.span
                          className="absolute -top-2 -right-2 bg-gold text-black text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 1.0 + i * 0.06 }}
                        >
                          New
                        </motion.span>
                      )}

                      {/* Rank */}
                      <span className={`text-sm font-bold ${rank.color}`}>
                        {rank.label}
                      </span>

                      {/* Player initials */}
                      <span className={`text-sm font-bold tabular-nums tracking-wider ${i === 0 ? 'text-gold text-base' : 'text-gold'}`}>
                        {entry.player_name.slice(0, 3).toUpperCase()}
                      </span>

                      {/* Case info */}
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {entry.suspect_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {entry.case_setting}
                        </p>
                      </div>

                      {/* Score */}
                      <p className={`text-sm font-bold text-right tabular-nums ${i === 0 || isNewEntry ? 'text-gold' : 'text-foreground'}`}>
                        {entry.score.toLocaleString()}
                      </p>

                      {/* Time remaining */}
                      <p className="text-sm text-gray-400 text-right tabular-nums">
                        {formatTime(entry.time_remaining)}
                      </p>

                      {/* Rating */}
                      <p className={`text-xs font-bold text-right ${ratingColor(entry.detective_rating)}`}>
                        {entry.detective_rating}
                      </p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          )}

          {/* Score breakdown legend */}
          {entries.length > 0 && (
            <motion.div
              className="mt-10 p-4 bg-surface-darker border border-surface-dark rounded-sm"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ ...smooth, delay: 0.5 }}
            >
              <p className="text-xs uppercase tracking-wider text-gray-600 mb-3">Scoring</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500">
                <span>Speed &times; difficulty</span>
                <span>Hints &minus;15% each</span>
                <span>Wrong acc. &minus;10% each</span>
                <span>Harder = more pts</span>
              </div>
            </motion.div>
          )}

        </div>
      </PageMotion>
    </PageShell>
  );
}
