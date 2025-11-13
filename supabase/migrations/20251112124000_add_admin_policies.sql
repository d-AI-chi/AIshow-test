/*
  # Add Admin Policies for Events and Questions

  ## Overview
  Adds INSERT and UPDATE policies for events and questions tables to allow
  admin operations without authentication (since this app doesn't use auth).

  ## Policies Added

  ### Events Table
  - Allow anyone to INSERT events (for admin page)
  - Allow anyone to UPDATE events (for admin page)

  ### Questions Table
  - Allow anyone to INSERT questions (for admin page)
  - Allow anyone to UPDATE questions (for admin page)
*/

-- Allow anyone to create events (for admin page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'events'
    AND policyname = 'Anyone can create events'
  ) THEN
    CREATE POLICY "Anyone can create events"
      ON events FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anyone to update events (for admin page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'events'
    AND policyname = 'Anyone can update events'
  ) THEN
    CREATE POLICY "Anyone can update events"
      ON events FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anyone to create questions (for admin page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'questions'
    AND policyname = 'Anyone can create questions'
  ) THEN
    CREATE POLICY "Anyone can create questions"
      ON questions FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anyone to update questions (for admin page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'questions'
    AND policyname = 'Anyone can update questions'
  ) THEN
    CREATE POLICY "Anyone can update questions"
      ON questions FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anyone to insert match results (for admin page)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'match_results'
    AND policyname = 'Anyone can insert match results'
  ) THEN
    CREATE POLICY "Anyone can insert match results"
      ON match_results FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- Allow anyone to delete match results (for recalculation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'match_results'
    AND policyname = 'Anyone can delete match results'
  ) THEN
    CREATE POLICY "Anyone can delete match results"
      ON match_results FOR DELETE
      USING (true);
  END IF;
END $$;

-- Allow anyone to update match results (for admin page to set is_hidden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'match_results'
    AND policyname = 'Anyone can update match results'
  ) THEN
    CREATE POLICY "Anyone can update match results"
      ON match_results FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

