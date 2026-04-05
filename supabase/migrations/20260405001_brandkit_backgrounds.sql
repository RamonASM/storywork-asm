-- Add background style options to brand kits
ALTER TABLE storywork_brand_kits
  ADD COLUMN IF NOT EXISTS background_style text NOT NULL DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS gradient_end_color text,
  ADD COLUMN IF NOT EXISTS gradient_direction text NOT NULL DEFAULT 'to-bottom';

COMMENT ON COLUMN storywork_brand_kits.background_style IS 'solid | gradient';
COMMENT ON COLUMN storywork_brand_kits.gradient_end_color IS 'Hex color for gradient end';
COMMENT ON COLUMN storywork_brand_kits.gradient_direction IS 'to-bottom | to-right | to-bottom-right';
