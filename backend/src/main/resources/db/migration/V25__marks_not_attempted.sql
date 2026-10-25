-- Questions the student did not attempt (NA), kept apart from a 0 for an attempted answer. Both count as 0 in the
-- totals. Keys: "A1".."A10" for Part A, "11a.i".."16b.iii" for a Part B / C box.
ALTER TABLE marks ADD COLUMN not_attempted TEXT[] NOT NULL DEFAULT '{}';
