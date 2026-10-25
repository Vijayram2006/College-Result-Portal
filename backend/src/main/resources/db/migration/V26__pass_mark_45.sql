-- The pass mark is 45 out of 100 (was 40). Saved answer scripts scoring 40-44 keep their marks; only their stored
-- result changes from C / PASS to F / FAIL, as the server now grades them.
UPDATE marks SET grade = 'F', passed = FALSE WHERE grand_total >= 40 AND grand_total < 45 AND passed;
