// Last N results for a team in a competition, rendered as W/D/L pills.
// `results` are ordered oldest-first; we render newest-first visually.

type Result = 'W' | 'D' | 'L';

const STYLE: Record<Result, string> = {
  W: 'bg-pitch-500 text-white',
  D: 'bg-ink-300 text-ink-800',
  L: 'bg-red-500 text-white',
};

const LABEL: Record<Result, string> = { W: 'נ', D: 'ת', L: 'ה' };

export function FormIndicator({ results }: { results: Result[] }) {
  const last5 = results.slice(-5);
  return (
    <div className="flex items-center gap-1 justify-end">
      {last5.map((r, i) => (
        <span key={i} className={`size-5 rounded-full grid place-items-center text-[10px] font-bold ${STYLE[r]}`}>
          {LABEL[r]}
        </span>
      ))}
    </div>
  );
}
