-- Anonymous evaluation: faculty see answer scripts under dummy numbers derived from this secret key (one row).
-- The key never leaves the server; the COE and the Associate Dean see the real register numbers.
CREATE TABLE anonymization_key (
    id      SMALLINT PRIMARY KEY CHECK (id = 1),
    secret  VARCHAR(64) NOT NULL
);
INSERT INTO anonymization_key (id, secret)
VALUES (1, md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text));
