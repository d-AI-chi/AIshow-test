/*
  # Add gender column to participants

  ## Overview
  Adds a gender column to allow participants to specify their gender (male, female, other).
  This is used for matching logic to avoid same-gender pairs (by default).
*/

-- Add gender column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'participants'
    AND column_name = 'gender'
  ) THEN
    ALTER TABLE participants
    ADD COLUMN gender varchar(10) CHECK (gender IN ('male', 'female', 'other'));
    
    COMMENT ON COLUMN participants.gender IS 'Gender of the participant: male, female, or other';
  END IF;
END $$;

