/*
  # Fix match_results RLS policies

  ## Overview
  Ensures that all necessary RLS policies for match_results table exist and are properly configured.
  This fixes the RLS policy violation errors when calculating matches and viewing results in admin page.
*/

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Anyone can insert match results" ON match_results;
DROP POLICY IF EXISTS "Anyone can update match results" ON match_results;
DROP POLICY IF EXISTS "Anyone can delete match results" ON match_results;
DROP POLICY IF EXISTS "Anyone can read match results" ON match_results;

-- Create INSERT policy for match_results (for admin page to calculate matches)
CREATE POLICY "Anyone can insert match results"
  ON match_results FOR INSERT
  WITH CHECK (true);

-- Create UPDATE policy for match_results (for admin page to set is_hidden)
CREATE POLICY "Anyone can update match results"
  ON match_results FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create DELETE policy for match_results (for recalculation)
CREATE POLICY "Anyone can delete match results"
  ON match_results FOR DELETE
  USING (true);

-- Create SELECT policy for match_results (for admin page to view results)
-- This allows anyone to read match_results (needed for admin page)
CREATE POLICY "Anyone can read match results"
  ON match_results FOR SELECT
  USING (true);

