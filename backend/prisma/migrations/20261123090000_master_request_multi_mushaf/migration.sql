-- Permohonan master boleh memuat lebih dari satu jenis mushaf (kode dipisah koma, label dipisah ", ").
ALTER TABLE `master_mushaf_requests`
    MODIFY `mushaf_type` VARCHAR(600) NOT NULL,
    MODIFY `mushaf_type_label` TEXT NOT NULL;
