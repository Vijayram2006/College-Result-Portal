-- In-app notifications (the bell icons). Each one targets an audience: the COE of a college, or the HODs, faculty
-- or students of one department (students optionally of one semester). Read state is kept per user.
CREATE TABLE notifications (
    id           BIGSERIAL    PRIMARY KEY,
    college_key  VARCHAR(20)  NOT NULL,
    audience     VARCHAR(10)  NOT NULL CHECK (audience IN ('COE', 'HOD', 'FACULTY', 'STUDENT')),
    dept_key     VARCHAR(10)  REFERENCES departments (dept_key) ON DELETE CASCADE,
    semester     SMALLINT     CHECK (semester IS NULL OR semester BETWEEN 1 AND 8),
    title        VARCHAR(160) NOT NULL,
    message      TEXT         NOT NULL,
    link         VARCHAR(200),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_target ON notifications (college_key, audience, dept_key, created_at DESC);

CREATE TABLE notification_reads (
    notification_id  BIGINT      NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
    user_id          BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    read_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (notification_id, user_id)
);
