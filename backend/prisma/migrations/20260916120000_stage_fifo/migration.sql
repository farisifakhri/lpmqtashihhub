ALTER TABLE `registrations`
  ADD COLUMN `stage_entered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Preserve the latest entry into the CURRENT stage, including re-submissions.
-- Registrations without history fall back to their creation date.
UPDATE `registrations` AS r
LEFT JOIN (
  SELECT h.registration_id, h.to_status, MAX(h.changed_at) AS entered_at
  FROM `status_histories` AS h
  GROUP BY h.registration_id, h.to_status
) AS h ON h.registration_id = r.id AND h.to_status = r.status
SET r.stage_entered_at = COALESCE(h.entered_at, r.created_at);

CREATE INDEX `registrations_status_stage_entered_at_id_idx`
  ON `registrations` (`status`, `stage_entered_at`, `id`);
