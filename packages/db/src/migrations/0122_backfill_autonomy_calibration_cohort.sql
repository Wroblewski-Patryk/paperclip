-- Decisions created before Iteration 5 did not carry a typed sample identity.
-- Keep them in the v1 calibration cohort so they cannot satisfy the v2.1
-- graduation gate merely because the schema default changed.
UPDATE "autonomy_decisions"
SET
  "decision_model_version" = 'work-selection-v1',
  "calibration_cohort" = 'work-selection-v1'
WHERE "sample_identity" = '{}'::jsonb;
