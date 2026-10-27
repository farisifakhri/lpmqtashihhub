-- RedefineIndex
CREATE INDEX `verification_document_signatories_document_id_signer_user_id_idx` ON `verification_document_signatories`(`document_id`, `signer_user_id`);
DROP INDEX `verification_document_signatories_document_id_signer_user_idx` ON `verification_document_signatories`;
