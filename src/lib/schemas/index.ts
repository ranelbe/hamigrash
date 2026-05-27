import { z } from 'zod';
import './errors-he'; // installs Hebrew error map globally

// Slugs can be Latin (a-z, 0-9, -) or Hebrew (Unicode block U+0590..U+05FF).
const slug = z.string()
  .min(2, { message: 'יש להזין לפחות 2 תווים בכתובת ייחודית' })
  .max(60, { message: 'מקסימום 60 תווים' })
  .regex(/^[a-z0-9֐-׿-]+$/, { message: 'יש להשתמש באותיות, ספרות או מקפים בלבד' });

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, { message: 'צבע לא תקין' });

const rating = z.number().int()
  .min(0, { message: 'הדירוג חייב להיות בין 0 ל־100' })
  .max(100, { message: 'הדירוג חייב להיות בין 0 ל־100' })
  .nullable().optional();

export const teamCreateSchema = z.object({
  name: z.string().min(2, { message: 'שם הקבוצה חייב להכיל לפחות 2 תווים' }).max(80, { message: 'שם הקבוצה ארוך מדי' }),
  short_name: z.string().max(8, { message: 'קיצור עד 8 תווים' }).optional(),
  slug,
  crest_url: z.string().url({ message: 'כתובת URL לא תקינה' }).optional().or(z.literal('')),
  crest_shape: z.enum(['hexagon', 'shield', 'circle', 'square', 'diamond', 'pentagon']).optional(),
  crest_text_color: hexColor.optional().nullable(),
  primary_color: hexColor.optional(),
  secondary_color: hexColor.optional(),
  home_venue: z.string().max(120, { message: 'שם המגרש ארוך מדי' }).optional(),
});
export type TeamCreateInput = z.infer<typeof teamCreateSchema>;

export const playerCreateSchema = z.object({
  team_id: z.string().uuid({ message: 'יש לבחור קבוצה' }),
  display_name: z.string().min(2, { message: 'שם השחקן חייב להכיל לפחות 2 תווים' }).max(80, { message: 'שם ארוך מדי' }),
  squad_number: z.number().int().min(1, { message: 'מספר חולצה בין 1 ל־99' }).max(99, { message: 'מספר חולצה בין 1 ל־99' }).optional().nullable(),
  position: z.enum(['GK', 'DF', 'MF', 'FW']).default('MF'),
  photo_url: z.string().url({ message: 'כתובת URL לא תקינה' }).optional().or(z.literal('')),
  training_group_id: z.string().uuid({ message: 'מזהה קבוצת אימון לא תקין' }).optional().nullable(),
  rating_pace: rating,
  rating_shooting: rating,
  rating_passing: rating,
  rating_dribbling: rating,
  rating_defending: rating,
  rating_physical: rating,
  rating_gk_diving: rating,
  rating_gk_handling: rating,
  rating_gk_kicking: rating,
  rating_gk_reflexes: rating,
  rating_gk_speed: rating,
  rating_gk_positioning: rating,
  address_city: z.string().max(80, { message: 'שם עיר ארוך מדי' }).optional().nullable(),
  address_street: z.string().max(120, { message: 'שם רחוב ארוך מדי' }).optional().nullable(),
});
export type PlayerCreateInput = z.infer<typeof playerCreateSchema>;

export const trainingGroupSchema = z.object({
  name: z.string().min(2, { message: 'שם קבוצה חייב לפחות 2 תווים' }).max(60, { message: 'מקסימום 60 תווים' }),
  description: z.string().max(200, { message: 'מקסימום 200 תווים' }).optional(),
});
export type TrainingGroupInput = z.infer<typeof trainingGroupSchema>;

export const competitionCreateSchema = z.object({
  name: z.string().min(2, { message: 'שם התחרות חייב להכיל לפחות 2 תווים' }).max(120, { message: 'שם התחרות ארוך מדי' }),
  slug,
  type: z.enum(['league', 'cup', 'friendly'], { errorMap: () => ({ message: 'יש לבחור סוג תחרות' }) }),
  status: z.enum(['draft', 'active', 'finished', 'archived']).optional(),
  format: z.enum(['5v5', '6v6', '7v7', '8v8', '9v9', '10v10', '11v11']).default('11v11'),
  season: z.string().max(20, { message: 'שם העונה ארוך מדי' }).optional(),
  starts_on: z.string().min(1, { message: 'יש לבחור תאריך תחילת תחרות' }),
  ends_on: z.string().min(1, { message: 'יש לבחור תאריך סיום תחרות' }),
  points_win: z.number().int().min(0, { message: 'בין 0 ל־10' }).max(10, { message: 'בין 0 ל־10' }).default(3),
  points_draw: z.number().int().min(0, { message: 'בין 0 ל־10' }).max(10, { message: 'בין 0 ל־10' }).default(1),
  points_loss: z.number().int().min(0, { message: 'בין 0 ל־10' }).max(10, { message: 'בין 0 ל־10' }).default(0),
  rounds: z.number().int().min(1, { message: 'לפחות סיבוב אחד' }).max(4, { message: 'מקסימום 4 סיבובים' }).default(1),
  has_group_stage: z.boolean().default(false),
  days_between_rounds: z.number().int().min(1, { message: 'לפחות יום אחד' }).max(30, { message: 'מקסימום 30 ימים' }).default(7),
  default_match_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'פורמט שעה לא תקין (HH:MM)' }).default('18:00'),
}).refine(v => !v.starts_on || !v.ends_on || v.ends_on >= v.starts_on, {
  message: 'תאריך הסיום חייב להיות אחרי תאריך ההתחלה',
  path: ['ends_on'],
});
export type CompetitionCreateInput = z.infer<typeof competitionCreateSchema>;

export const matchCreateSchema = z.object({
  competition_id: z.string().uuid().optional().nullable(),
  home_team_id: z.string().uuid({ message: 'יש לבחור קבוצה בית' }),
  away_team_id: z.string().uuid({ message: 'יש לבחור קבוצה חוץ' }),
  scheduled_at: z.string().min(1, { message: 'יש לבחור מועד למשחק' }),
  venue: z.string().max(120, { message: 'שם המגרש ארוך מדי' }).optional(),
  round_label: z.string().max(40, { message: 'תווית ארוכה מדי' }).optional(),
  format: z.enum(['5v5', '6v6', '7v7', '8v8', '9v9', '10v10', '11v11']).optional(),
  period_length_min: z.number().int().min(1, { message: 'לפחות דקה אחת' }).max(60, { message: 'מקסימום 60 דקות' }).default(45),
  number_of_periods: z.number().int().min(1, { message: 'לפחות מחצית אחת' }).max(4, { message: 'מקסימום 4 מחציות' }).default(2),
}).refine(v => v.home_team_id !== v.away_team_id, { message: 'קבוצת הבית והחוץ חייבות להיות שונות', path: ['away_team_id'] });
export type MatchCreateInput = z.infer<typeof matchCreateSchema>;

export const matchEventSchema = z.object({
  client_id: z.string().uuid(),
  match_id: z.string().uuid(),
  team_id: z.string().uuid().optional().nullable(),
  player_id: z.string().uuid().optional().nullable(),
  related_player_id: z.string().uuid().optional().nullable(),
  event_type: z.enum([
    'goal', 'own_goal', 'assist', 'yellow_card', 'red_card',
    'substitution_in', 'substitution_out', 'save',
    'penalty_scored', 'penalty_missed', 'period_start', 'period_end',
  ]),
  period: z.number().int().min(1).max(4),
  minute: z.number().int().min(0).max(200).optional().nullable(),
  extra_minute: z.number().int().min(0).max(30).default(0),
  payload: z.record(z.any()).default({}),
});
export type MatchEventInput = z.infer<typeof matchEventSchema>;

export const invitationCreateSchema = z.object({
  email: z.string().email({ message: 'כתובת דוא"ל לא תקינה' }),
  kind: z.enum(['team', 'competition', 'match_official']),
  team_id: z.string().uuid().optional(),
  competition_id: z.string().uuid().optional(),
  match_id: z.string().uuid().optional(),
  team_role: z.enum(['manager', 'assistant', 'player', 'pending']).optional(),
  competition_role: z.enum(['organiser', 'admin', 'scorer']).optional(),
  match_role: z.enum(['referee', 'scorer', 'assistant']).optional(),
  message: z.string().max(500, { message: 'מקסימום 500 תווים' }).optional(),
}).superRefine((v, ctx) => {
  if (v.kind === 'team' && (!v.team_id || !v.team_role))
    ctx.addIssue({ code: 'custom', message: 'יש לבחור קבוצה', path: ['team_id'] });
  if (v.kind === 'competition' && (!v.competition_id || !v.competition_role))
    ctx.addIssue({ code: 'custom', message: 'יש לבחור תחרות', path: ['competition_id'] });
  if (v.kind === 'match_official' && (!v.match_id || !v.match_role))
    ctx.addIssue({ code: 'custom', message: 'יש לבחור משחק', path: ['match_id'] });
});
export type InvitationCreateInput = z.infer<typeof invitationCreateSchema>;
