-- Per-student fees: bus routes (priced by distance) and hostel room types are rates the Accounts office keeps once a
-- year; each student is given a route and a room, and their bus / hostel dues follow from that. The class-wide fee
-- structure carries only the common fees (tuition, exam, ...).
INSERT INTO fee_heads (code, name, category) VALUES ('HOSTEL', 'Hostel fee', 'HOSTEL') ON CONFLICT (code) DO NOTHING;

CREATE TABLE fee_service_rates (
    id           BIGSERIAL      PRIMARY KEY,
    college_key  VARCHAR(20)    NOT NULL,
    kind         VARCHAR(10)    NOT NULL CHECK (kind IN ('BUS', 'HOSTEL')),
    name         VARCHAR(120)   NOT NULL,
    amount       NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    active       BOOLEAN        NOT NULL DEFAULT TRUE,
    UNIQUE (college_key, kind, name)
);

CREATE TABLE student_services (
    reg_no          VARCHAR(30)  PRIMARY KEY REFERENCES students (reg_no) ON DELETE CASCADE,
    bus_rate_id     BIGINT       REFERENCES fee_service_rates (id),
    hostel_rate_id  BIGINT       REFERENCES fee_service_rates (id),
    updated_by      VARCHAR(160) NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- The route / room a bus or hostel due was raised for (shown on the student's bill and receipt)
ALTER TABLE fee_demands ADD COLUMN service_rate_id BIGINT REFERENCES fee_service_rates (id);
