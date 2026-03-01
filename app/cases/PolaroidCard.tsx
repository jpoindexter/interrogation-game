'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from '../components/motion';
import { DIFFICULTY_CONFIG } from '../data/cases';

interface CaseData {
  id: string;
  title: string;
  subtitle: string;
  bg: string;
  setting: string;
  description: string;
  difficulty: string;
}

interface PolaroidCardProps {
  caseData: CaseData;
  isActive: boolean;
  expanded: boolean;
  isSolved: boolean;
  index: number;
  fanX: number;
  fanY: number;
  fanRotate: number;
  fanScale: number;
  zIndex: number;
  opacity: number;
  onClick: () => void;
}

const ROTATIONS = [-3, 2.5, -1.5, 4, -2, 3.5, -4];
const STICKY_COLORS = ['#F5E6A3,#EDD98B', '#FFB3B3,#F5A0A0', '#A3D5F5,#8DC8EE', '#B3F5B3,#9BE89B', '#F5C8A3,#EEB88D', '#D5A3F5,#C88DEE', '#F5A3D5,#EE8DC8'];
const STICKY_ROTS = [1, -1.5, 2, -1, 1.5, -2, 0.5];

export default function PolaroidCard({ caseData, isActive, expanded, isSolved, index, fanX, fanY, fanRotate, fanScale, zIndex, opacity, onClick }: PolaroidCardProps) {
  const router = useRouter();
  const caseDiff = DIFFICULTY_CONFIG[caseData.difficulty];

  return (
    <motion.div
      className="absolute bottom-0"
      animate={{ x: fanX, y: fanY, rotate: fanRotate, scale: fanScale, opacity }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ zIndex, transformOrigin: 'bottom center' }}
    >
      <motion.div animate={isActive && !expanded ? { y: [0, -4, 0] } : { y: 0 }} transition={isActive && !expanded ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.15 }}>
        <button onClick={onClick} className={`group relative cursor-pointer w-[260px] sm:w-[290px] ${isActive ? '' : 'pointer-events-auto'}`}>
          <motion.div
            className="relative p-2 pb-14"
            style={{
              background: 'linear-gradient(135deg, #E8E0D0 0%, #D8CFC0 40%, #E2DAC8 60%, #D5CCBB 100%)',
              boxShadow: isActive ? '3px 5px 20px rgba(0,0,0,0.7), 1px 2px 4px rgba(0,0,0,0.3), inset 0 0 30px rgba(0,0,0,0.05)' : '2px 3px 10px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.03)',
            }}
            animate={isActive && expanded ? { scale: 1.05 } : { scale: 1 }}
            whileHover={isActive && !expanded ? { scale: 1.02 } : {}}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(45deg, transparent 48%, rgba(0,0,0,0.03) 49%, rgba(0,0,0,0.03) 51%, transparent 52%)' }} />
            <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none" style={{ background: 'linear-gradient(225deg, rgba(0,0,0,0.08) 0%, transparent 60%)' }} />

            <div className="relative overflow-hidden" style={{ aspectRatio: '3 / 2' }}>
              <div className={`absolute inset-0 ${isActive ? 'transition-transform duration-500 group-hover:scale-105' : ''}`} style={{ backgroundImage: `url(${caseData.bg})`, backgroundSize: 'cover', backgroundPosition: 'center', imageRendering: 'pixelated' }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

              {isActive && (
                <motion.div className="absolute top-2 left-2" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.3 }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm" style={{ backgroundColor: caseDiff.color, color: '#000' }}>{caseDiff.label}</span>
                </motion.div>
              )}

              {isActive && (
                <div className="absolute top-2 right-2 flex items-center gap-0.5">
                  {[...Array(5)].map((_, si) => (
                    <motion.img key={si} src={si < caseDiff.stars ? '/ui/star_filled.png' : '/ui/star_empty.png'} alt="" className="w-3.5 h-3.5" style={{ imageRendering: 'pixelated' }}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0, ...(si < caseDiff.stars ? { filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] } : {}) }}
                      transition={{ scale: { delay: 0.1 + si * 0.08, duration: 0.3, type: 'spring' }, rotate: { delay: 0.1 + si * 0.08, duration: 0.3 }, filter: si < caseDiff.stars ? { delay: 0.5 + si * 0.15, duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : undefined }}
                    />
                  ))}
                </div>
              )}

              {isSolved && (
                <motion.div className="absolute inset-0 flex items-center justify-center" initial={{ scale: 2, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 0.7, rotate: -12 }} transition={{ duration: 0.4, type: 'spring', damping: 12 }}>
                  <img src="/solved/case_closed.png" alt="Solved" className="w-28" />
                </motion.div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center px-3">
              <div className="text-center">
                <h2 className={`text-sm font-bold tracking-wider ${isActive ? 'text-gray-800 group-hover:text-accent transition-colors' : 'text-gray-700'}`}>{caseData.title}</h2>
                {isActive && !expanded && (
                  <motion.p className="text-[9px] text-gray-500 uppercase tracking-wider" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>{caseData.subtitle}</motion.p>
                )}
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {isActive && expanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.12, ease: 'easeOut' }} className="mt-2 overflow-hidden">
                <div className="relative p-4 text-left" style={{
                  background: `linear-gradient(180deg, ${STICKY_COLORS[index % 7].split(',').map((c, ci) => `${c} ${ci * 100}%`).join(', ')})`,
                  boxShadow: '2px 3px 12px rgba(0,0,0,0.4), inset 0 0 30px rgba(0,0,0,0.03)',
                  transform: `rotate(${STICKY_ROTS[index % 7]}deg)`,
                  filter: 'url(#sticky-wrinkle)',
                }}>
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(130deg, transparent 35%, rgba(0,0,0,0.06) 35.5%, transparent 36%), linear-gradient(60deg, transparent 50%, rgba(255,255,255,0.1) 50.5%, transparent 51%), linear-gradient(165deg, transparent 65%, rgba(0,0,0,0.04) 65.5%, transparent 66%)' }} />
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-5 pointer-events-none z-10" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.15) 100%)', borderRadius: '1px' }} />
                  <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none" style={{ background: 'linear-gradient(315deg, rgba(0,0,0,0.12) 0%, transparent 60%)' }} />
                  <p className="text-[11px] text-gray-800 leading-relaxed mb-3">{caseData.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">{caseDiff.label} &middot; {caseDiff.clues} clues to find</span>
                    <motion.span className="text-[10px] font-bold text-accent uppercase tracking-wider cursor-pointer hover:text-red-500 transition-colors px-2 py-1 -mr-2" animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                      onClick={(e) => { e.stopPropagation(); router.push(`/game?setting=${encodeURIComponent(caseData.setting)}&difficulty=${caseData.difficulty}`); }}
                    >PLAY &rarr;</motion.span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </motion.div>
    </motion.div>
  );
}
