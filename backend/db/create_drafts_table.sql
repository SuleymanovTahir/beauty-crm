CREATE TABLE IF NOT EXISTS booking_drafts (
    instagram_id TEXT PRIMARY KEY,
    data TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
