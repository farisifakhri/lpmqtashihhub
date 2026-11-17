-- Paraf wajib oleh seluruh Pemaraf aktif (saat ini 2 akun): simpan daftar penanda paraf dan jumlah yang wajib.
-- signed_at tetap menjadi penanda "paraf lengkap" sehingga gerbang ke Kepala LPMQ tidak berubah.
ALTER TABLE `approval_parafs` ADD COLUMN `signers` JSON NULL,
    ADD COLUMN `required_count` INTEGER NULL;
