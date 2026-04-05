ALTER TABLE storywork_stories
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS location_data jsonb;

CREATE INDEX IF NOT EXISTS idx_storywork_stories_location
  ON storywork_stories (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
