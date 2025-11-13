/*
  # Add match threshold setting to events

  ## Overview
  Adds a configurable compatibility threshold to the events table so admins can
  define what percentage counts as a successful match.
*/

ALTER TABLE events
ADD COLUMN IF NOT EXISTS match_threshold numeric(5,2) DEFAULT 85;

COMMENT ON COLUMN events.match_threshold IS 'Compatibility percentage required to consider a pair a successful match.';

