ALTER TABLE transport_request_items
    ADD COLUMN vehicle_type ENUM('taxi','bus') NOT NULL DEFAULT 'taxi' AFTER agent_id;
