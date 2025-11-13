/*
  # Add is_hidden column to match_results

  ## Overview
  Adds a column to allow admins to hide specific match pairs even if they meet the threshold.
*/

-- Add is_hidden column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'match_results'
    AND column_name = 'is_hidden'
  ) THEN
    ALTER TABLE match_results
    ADD COLUMN is_hidden boolean DEFAULT false;
    
    COMMENT ON COLUMN match_results.is_hidden IS 'Whether this match pair should be hidden from participants even if it meets the threshold.';
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_match_results_is_hidden ON match_results(is_hidden);

