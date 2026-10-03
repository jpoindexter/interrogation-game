export default function CaseUpdates({ unread, onLatest, onLeads }: {
  unread: { replies: number; leads: number }; onLatest: () => void; onLeads: () => void;
}) {
  const button = 'min-h-11 px-3 py-2 text-xs font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-[-4px]';
  return <div className="relative z-10 shrink-0 border-black/20 bg-[#F0EDE6] text-black" aria-live="polite" aria-atomic="true">
    {(unread.replies > 0 || unread.leads > 0) && <div className="flex flex-wrap justify-center border-t border-black/20">
      {unread.replies > 0 && <button type="button" onClick={onLatest} className={button}>
        {unread.replies} new {unread.replies === 1 ? 'reply' : 'replies'} · View latest
      </button>}
      {unread.leads > 0 && <button type="button" onClick={onLeads} className={button}>
        {unread.leads} new {unread.leads === 1 ? 'lead' : 'leads'} · View leads
      </button>}
    </div>}
  </div>;
}
