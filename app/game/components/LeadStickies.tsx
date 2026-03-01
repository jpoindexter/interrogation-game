import { motion } from '../../components/motion';

const COLORS = [['#FFB3B3', '#F5A0A0'], ['#A3D5F5', '#8DC8EE'], ['#B3F5B3', '#9BE89B']];
const ROTATIONS = [12, -10, 8];
const OFFSETS = ['ml-2', 'mr-6', 'ml-4'];

export default function LeadStickies({ leads }: { leads: string[] }) {
  return (
    <div className="hidden lg:flex flex-col gap-4 shrink-0 pt-4">
      {leads.map((lead, i) => {
        const bg = COLORS[i % COLORS.length];
        return (
          <motion.div
            key={i}
            className={`relative p-5 pt-7 w-56 min-h-[10rem] flex items-center ${OFFSETS[i % OFFSETS.length]}`}
            style={{
              background: `linear-gradient(180deg, ${bg[0]} 0%, ${bg[1]} 100%)`,
              boxShadow: '2px 3px 10px rgba(0,0,0,0.35), inset 0 0 20px rgba(0,0,0,0.03)',
              transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)`,
              filter: 'url(#paper-wrinkle)',
            }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.15, duration: 0.3 }}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
              <div className="w-4 h-4 rounded-full shadow-md border border-red-900" style={{ background: 'radial-gradient(circle at 35% 35%, #e85555, #8b1a1a)' }} />
              <div className="w-[2px] h-[3px] bg-gray-500 mx-auto -mt-[1px]" />
            </div>
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'linear-gradient(125deg, transparent 30%, rgba(0,0,0,0.06) 30.5%, transparent 31%), linear-gradient(65deg, transparent 55%, rgba(255,255,255,0.1) 55.5%, transparent 56%)',
            }} />
            <p className="text-lg text-gray-800 leading-snug relative z-10" style={{ fontFamily: 'var(--font-handwriting)' }}>{lead}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
