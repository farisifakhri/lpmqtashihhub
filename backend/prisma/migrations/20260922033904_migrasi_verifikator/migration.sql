-- MariaDB compatibility: DROP INDEX/ADD INDEX works across MySQL and MariaDB.
ALTER TABLE `verification_document_signatories`
  DROP INDEX `verification_document_signatories_document_id_signer_user_idx`,
  ADD INDEX `verification_document_signatories_document_id_signer_user_id_idx` (`document_id`, `signer_user_id`);
