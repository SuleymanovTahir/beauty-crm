-- Migration: Add universal settings fields to salon_settings (Safe version)
-- Date: 2025-11-27
-- Description: Add timezone_offset, birthday_discount if they don't exist

-- Check and add timezone_offset field
ALTER TABLE salon_settings ADD COLUMN timezone_offset TEXT DEFAULT 'UTC+4';

-- Check and add birthday_discount field  
ALTER TABLE salon_settings ADD COLUMN birthday_discount TEXT DEFAULT '15%';
