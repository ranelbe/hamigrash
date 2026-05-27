// Minimal hand-curated type surface. Replace with the output of
// `supabase gen types typescript --linked > database.types.ts`
// once the schema is deployed.

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type TeamMemberRole = 'manager' | 'assistant' | 'player' | 'pending';
export type CompetitionMemberRole = 'organiser' | 'admin' | 'scorer';
export type MatchOfficialRole = 'referee' | 'scorer' | 'assistant';
export type InvitationKind = 'team' | 'competition' | 'match_official';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type CompetitionType = 'league' | 'cup' | 'friendly';
export type CompetitionStatus = 'draft' | 'active' | 'finished' | 'archived';
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type MatchFormat = '5v5' | '6v6' | '7v7' | '8v8' | '9v9' | '10v10' | '11v11';
export type MatchEventType =
  | 'goal' | 'own_goal' | 'assist' | 'yellow_card' | 'red_card'
  | 'substitution_in' | 'substitution_out' | 'save'
  | 'penalty_scored' | 'penalty_missed'
  | 'period_start' | 'period_end';
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export type CrestShape = 'hexagon' | 'shield' | 'circle' | 'square' | 'diamond' | 'pentagon';

export interface Team {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  crest_url: string | null;
  crest_shape: CrestShape;
  crest_text_color: string | null;
  primary_color: string;
  secondary_color: string;
  home_venue: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingGroup {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  team_id: string;
  profile_id: string | null;
  display_name: string;
  squad_number: number | null;
  position: PlayerPosition;
  photo_url: string | null;
  is_active: boolean;
  training_group_id: string | null;
  rating_pace: number | null;
  rating_shooting: number | null;
  rating_passing: number | null;
  rating_dribbling: number | null;
  rating_defending: number | null;
  rating_physical: number | null;
  rating_gk_diving: number | null;
  rating_gk_handling: number | null;
  rating_gk_kicking: number | null;
  rating_gk_reflexes: number | null;
  rating_gk_speed: number | null;
  rating_gk_positioning: number | null;
  created_at: string;
  updated_at: string;
}

export interface Competition {
  id: string;
  slug: string;
  name: string;
  type: CompetitionType;
  status: CompetitionStatus;
  format: MatchFormat;
  season: string | null;
  starts_on: string | null;
  ends_on: string | null;
  points_win: number;
  points_draw: number;
  points_loss: number;
  rounds: number;
  has_group_stage: boolean;
  days_between_rounds: number;
  default_match_time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  competition_id: string | null;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string | null;
  status: MatchStatus;
  venue: string | null;
  round_label: string | null;
  bracket_round: number | null;
  bracket_slot: number | null;
  format: MatchFormat | null;
  period_length_min: number;
  number_of_periods: number;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchEvent {
  id: string;
  client_id: string | null;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  related_player_id: string | null;
  event_type: MatchEventType;
  period: number;
  minute: number | null;
  extra_minute: number | null;
  payload: Record<string, Json>;
  recorded_by: string | null;
  recorded_at: string;
  is_cancelled: boolean;
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  kind: InvitationKind;
  status: InvitationStatus;
  team_id: string | null;
  competition_id: string | null;
  match_id: string | null;
  team_role: TeamMemberRole | null;
  competition_role: CompetitionMemberRole | null;
  match_role: MatchOfficialRole | null;
  invited_by: string;
  message: string | null;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
}

export interface StandingRow {
  competition_id: string;
  team_id: string;
  team_name: string;
  team_crest: string | null;
  group_label: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}
