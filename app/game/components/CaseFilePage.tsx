import type { Case } from '@/lib/game-state';

export const SECTION_HEADER = 'text-xs uppercase tracking-wider font-bold text-center py-1.5 px-2 border border-black/30';

const CASE_HEADER_BG = { background: '#d4c4a0' };

export default function CasePage({ caseData }: { caseData: Case }) {
  return (
    <div className="p-4 text-black">
      <p className="text-base font-bold text-center uppercase tracking-widest mb-1">Police Incident Report</p>
      <p className="text-xs text-black/40 text-center mb-3">Case No. {caseData.case_number}</p>

      <hr className="border-black/20 mb-3" />

      <div className={SECTION_HEADER} style={CASE_HEADER_BG}>The Crime</div>
      <div className="py-2">
        <p className="text-[11px] uppercase tracking-wider font-bold text-black/50 underline mb-0.5">Nature of Crime</p>
        <p className="text-sm leading-relaxed">{caseData.crime}</p>
      </div>

      <div className={SECTION_HEADER} style={CASE_HEADER_BG}>Person Involved</div>
      <div className="py-2 grid grid-cols-[1fr_auto] gap-x-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold text-black/50 underline mb-0.5">Full Name</p>
          <p className="text-sm">{caseData.suspect_name}</p>
        </div>
        <div className="min-w-[80px]">
          <p className="text-[11px] uppercase tracking-wider font-bold text-black/50 underline mb-0.5">Role</p>
          <p className="text-sm">{caseData.suspect_role}</p>
        </div>
      </div>

      <div className={SECTION_HEADER} style={CASE_HEADER_BG}>The Incident</div>
      <div className="py-2 grid grid-cols-[1fr_auto] gap-x-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold text-black/50 underline mb-0.5">Location</p>
          <p className="text-sm">{caseData.setting}</p>
        </div>
        <div className="min-w-[80px]">
          <p className="text-[11px] uppercase tracking-wider font-bold text-black/50 underline mb-0.5">Case No.</p>
          <p className="text-sm">{caseData.case_number}</p>
        </div>
      </div>

      <div className={SECTION_HEADER} style={CASE_HEADER_BG}>Briefing</div>
      <div className="py-2">
        <p className="text-sm leading-relaxed text-black/70">{caseData.briefing}</p>
      </div>
    </div>
  );
}
