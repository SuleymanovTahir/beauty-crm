CREATE TABLE booking_holds (
    id SERIAL PRIMARY KEY,
    service_id INTEGER,
    master VARCHAR(255),
    date VARCHAR(20),
    time VARCHAR(10),
    client_id VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
