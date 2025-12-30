-- Add scheduling and repeat fields to notification_history table

ALTER TABLE notification_history
ADD COLUMN IF NOT EXISTS scheduled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS schedule_datetime TIMESTAMP,
ADD COLUMN IF NOT EXISTS repeat_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS repeat_interval VARCHAR(20),  -- 'daily', 'weekly', 'monthly'
ADD COLUMN IF NOT EXISTS repeat_end_date DATE,
ADD COLUMN IF NOT EXISTS target_segment VARCHAR(50),
ADD COLUMN IF NOT EXISTS filter_params JSONB;  -- Store all filter parameters as JSON

-- Create index for scheduled notifications
CREATE INDEX IF NOT EXISTS idx_notification_scheduled ON notification_history(scheduled, schedule_datetime, status)
WHERE scheduled = TRUE AND status = 'pending';
