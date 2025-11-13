-- Add admin_code column to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'admin_code'
  ) THEN
    ALTER TABLE events
    ADD COLUMN admin_code text;
    
    COMMENT ON COLUMN events.admin_code IS 'Code required to access the admin page for this event.';
  END IF;
END $$;

