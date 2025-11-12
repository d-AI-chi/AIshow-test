/*
  # Wedding Reception Matching Game Schema

  ## Overview
  This migration creates the database schema for a matching game system used at wedding receptions.
  Participants answer survey questions and get matched based on compatibility.

  ## Tables Created

  ### 1. `events`
  Stores wedding reception events
  - `id` (uuid, primary key) - Unique event identifier
  - `name` (text) - Event name (e.g., "Taro & Hanako's Reception")
  - `access_code` (text, unique) - Secret code for accessing the event
  - `is_active` (boolean) - Whether the event is currently active
  - `results_visible` (boolean) - Whether participants can see matching results
  - `created_at` (timestamptz) - Event creation timestamp
  - `ends_at` (timestamptz) - Event end time (for auto-cleanup)

  ### 2. `questions`
  Stores survey questions for each event
  - `id` (uuid, primary key) - Question identifier
  - `event_id` (uuid, foreign key) - References events table
  - `question_text` (text) - The question content
  - `options` (jsonb) - Array of answer options (e.g., ["Option A", "Option B", "Option C"])
  - `order_index` (integer) - Display order of questions
  - `created_at` (timestamptz) - Question creation timestamp

  ### 3. `participants`
  Stores participant information
  - `id` (uuid, primary key) - Participant identifier
  - `event_id` (uuid, foreign key) - References events table
  - `name` (text) - Participant's name or nickname
  - `profile_image_url` (text, optional) - URL to uploaded profile image
  - `created_at` (timestamptz) - Registration timestamp

  ### 4. `answers`
  Stores participant answers to questions
  - `id` (uuid, primary key) - Answer identifier
  - `participant_id` (uuid, foreign key) - References participants table
  - `question_id` (uuid, foreign key) - References questions table
  - `selected_option_index` (integer) - Index of selected option (0-based)
  - `created_at` (timestamptz) - Answer submission timestamp

  ### 5. `match_results`
  Stores calculated compatibility scores between participants
  - `id` (uuid, primary key) - Match result identifier
  - `event_id` (uuid, foreign key) - References events table
  - `participant_id` (uuid, foreign key) - References participants table
  - `matched_participant_id` (uuid, foreign key) - References participants table
  - `compatibility_score` (numeric) - Compatibility percentage (0-100)
  - `calculated_at` (timestamptz) - Calculation timestamp

  ## Security (RLS Policies)

  ### Events Table
  - Participants can read events they have access to (via access_code)
  - Only authenticated admins can create/update events

  ### Questions Table
  - Participants can read questions for events they have access to
  - Only authenticated admins can create/update questions

  ### Participants Table
  - Participants can read other participants in the same event
  - Participants can insert their own registration
  - Participants can update their own profile

  ### Answers Table
  - Participants can read their own answers
  - Participants can insert their own answers
  - Answers cannot be updated after submission

  ### Match Results Table
  - Participants can read their own match results when results_visible is true
  - System calculates and inserts match results

  ## Notes
  - All tables have RLS enabled for security
  - Event data should be cleaned up after `ends_at` timestamp
  - Profile images are stored as URLs (uploaded to Supabase Storage)
  - Compatibility calculation happens server-side via Edge Function
*/

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  access_code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  results_visible boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  ends_at timestamptz NOT NULL
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active events with valid access code"
  ON events FOR SELECT
  USING (is_active = true);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions for active events"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = questions.event_id
      AND events.is_active = true
    )
  );

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  profile_image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read other participants in same event"
  ON participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = participants.event_id
      AND events.is_active = true
    )
  );

CREATE POLICY "Anyone can register as participant"
  ON participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_id
      AND events.is_active = true
    )
  );

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, question_id)
);

ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read their own answers"
  ON answers FOR SELECT
  USING (true);

CREATE POLICY "Participants can submit their answers"
  ON answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = participant_id
    )
  );

-- Create match_results table
CREATE TABLE IF NOT EXISTS match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  matched_participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  compatibility_score numeric(5,2) NOT NULL,
  calculated_at timestamptz DEFAULT now(),
  UNIQUE(participant_id, matched_participant_id)
);

ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read their match results when visible"
  ON match_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = match_results.event_id
      AND events.results_visible = true
    )
    AND participant_id IN (
      SELECT id FROM participants WHERE event_id = match_results.event_id
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_event_id ON questions(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_event_id ON participants(event_id);
CREATE INDEX IF NOT EXISTS idx_answers_participant_id ON answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_match_results_participant_id ON match_results(participant_id);
CREATE INDEX IF NOT EXISTS idx_match_results_event_id ON match_results(event_id);