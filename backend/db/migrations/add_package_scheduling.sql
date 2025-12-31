-- Add scheduling fields to special_packages table

ALTER TABLE special_packages
ADD COLUMN IF NOT EXISTS scheduled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS schedule_date DATE,
ADD COLUMN IF NOT EXISTS schedule_time TIME,
ADD COLUMN IF NOT EXISTS auto_activate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS auto_deactivate BOOLEAN DEFAULT FALSE;

-- Create index for scheduled packages
CREATE INDEX IF NOT EXISTS idx_packages_scheduled ON special_packages(scheduled, schedule_date)
WHERE scheduled = TRUE AND is_active = FALSE;
