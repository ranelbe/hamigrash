-- ============================================================
-- HaMigrash — 0001: extensions and enums
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "uuid-ossp";

-- ---- Enums --------------------------------------------------

create type team_member_role as enum ('manager', 'assistant', 'player', 'pending');

create type competition_member_role as enum ('organiser', 'admin', 'scorer');

create type match_official_role as enum ('referee', 'scorer', 'assistant');

create type invitation_kind as enum ('team', 'competition', 'match_official');

create type invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

create type competition_type as enum ('league', 'cup', 'friendly');

create type competition_status as enum ('draft', 'active', 'finished', 'archived');

create type match_status as enum ('scheduled', 'live', 'finished', 'cancelled');

create type match_format as enum ('5v5', '6v6', '7v7', '8v8', '9v9', '10v10', '11v11');

create type match_event_type as enum (
  'goal', 'own_goal', 'assist', 'yellow_card', 'red_card',
  'substitution_in', 'substitution_out', 'save', 'penalty_scored',
  'penalty_missed', 'period_start', 'period_end'
);

create type player_position as enum ('GK', 'DF', 'MF', 'FW');
