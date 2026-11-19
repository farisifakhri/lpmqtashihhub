-- Label mutu (A–D) yang bisa diganti Super Admin per survei; NULL = label bawaan.
ALTER TABLE `surveys` ADD COLUMN `mutu_labels` JSON NULL;
