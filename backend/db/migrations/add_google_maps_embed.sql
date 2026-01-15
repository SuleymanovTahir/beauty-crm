-- Добавление колонок для Google Maps embed
ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS google_maps_embed_url TEXT;
ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS map_url TEXT;

-- Обновление значений
UPDATE salon_settings 
SET 
    google_maps_embed_url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115806.13211234567!2d55.14!3d25.08!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f6b0000000000%3A0x0!2zTWFyaW5hIE1hbGw!5e0!3m2!1sen!2sae!4v1234567890',
    map_url = 'https://maps.app.goo.gl/BTw4X1gzgyFhmkYF8'
WHERE id = 1;
