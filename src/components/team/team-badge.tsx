import { contrastText } from '@/lib/utils';
import type { CrestShape } from '@/lib/supabase/database.types';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const PX: Record<Size, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 96 };
const FONT_SIZE: Record<Size, number> = { xs: 38, sm: 34, md: 32, lg: 30, xl: 28 };

type Team = {
  name: string;
  short_name?: string | null;
  primary_color?: string | null;
  crest_shape?: CrestShape | null;
  crest_text_color?: string | null;
};

// SVG paths normalized to a 100x100 viewBox.
const SHAPES: Record<CrestShape, string> = {
  hexagon:  'M50 3 L92 26 L92 74 L50 97 L8 74 L8 26 Z',
  shield:   'M50 4 L88 14 L88 50 C88 76 70 90 50 96 C30 90 12 76 12 50 L12 14 Z',
  circle:   'M50 50 m -46 0 a 46 46 0 1 0 92 0 a 46 46 0 1 0 -92 0',
  square:   'M14 6 L86 6 Q94 6 94 14 L94 86 Q94 94 86 94 L14 94 Q6 94 6 86 L6 14 Q6 6 14 6 Z',
  diamond:  'M50 4 L96 50 L50 96 L4 50 Z',
  pentagon: 'M50 4 L94 36 L78 90 L22 90 L6 36 Z',
};

export function TeamBadge({ team, size = 'md' }: { team: Team; size?: Size }) {
  const fill = team.primary_color ?? '#475569';
  const fg = team.crest_text_color || contrastText(fill);
  const shape: CrestShape = (team.crest_shape as CrestShape) ?? 'hexagon';
  const path = SHAPES[shape] ?? SHAPES.hexagon;
  const px = PX[size];
  const initials = (team.short_name ?? team.name.slice(0, 2)).slice(0, 3);

  return (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      className="shrink-0"
      aria-label={team.name}
    >
      <path d={path} fill={fill} />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontWeight="700"
        fontSize={FONT_SIZE[size]}
        fill={fg}
        style={{ fontFamily: 'var(--font-rubik), system-ui, sans-serif' }}
      >
        {initials}
      </text>
    </svg>
  );
}
