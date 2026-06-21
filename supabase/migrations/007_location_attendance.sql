-- Migration 007: location-aware attendance check-in
alter table attendance add column if not exists latitude numeric;
alter table attendance add column if not exists longitude numeric;
alter table attendance add column if not exists distance_from_office numeric;
alter table attendance add column if not exists override_note text;
