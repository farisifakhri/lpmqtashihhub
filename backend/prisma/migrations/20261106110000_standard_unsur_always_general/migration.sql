-- 9 unsur baku PANRB berlaku untuk semua survei, jadi tidak boleh terikat ke satu survei.
-- Mengembalikan unsur baku yang terlanjur dikhususkan (mis. "Persyaratan") menjadi unsur umum.
UPDATE `survey_unsur` SET `survey_id` = NULL WHERE `is_standard` = true AND `survey_id` IS NOT NULL;
