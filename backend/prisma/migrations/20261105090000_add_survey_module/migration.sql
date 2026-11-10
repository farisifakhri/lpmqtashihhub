-- CreateTable
CREATE TABLE `survey_unsur` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `kind` VARCHAR(20) NOT NULL DEFAULT 'IKM',
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `survey_unsur_code_key`(`code`),
    INDEX `survey_unsur_kind_idx`(`kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_questions` (
    `id` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'PILIHAN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_options` (
    `id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `value` INTEGER NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `survey_options_question_id_idx`(`question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `surveys` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `kind` VARCHAR(20) NOT NULL DEFAULT 'IKM',
    `description` TEXT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `surveys_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_items` (
    `id` VARCHAR(191) NOT NULL,
    `survey_id` VARCHAR(191) NOT NULL,
    `unsur_id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `survey_items_unsur_id_idx`(`unsur_id`),
    INDEX `survey_items_question_id_idx`(`question_id`),
    UNIQUE INDEX `survey_items_survey_id_question_id_key`(`survey_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_responses` (
    `id` VARCHAR(191) NOT NULL,
    `survey_id` VARCHAR(191) NOT NULL,
    `registration_id` VARCHAR(191) NULL,
    `respondent_name` VARCHAR(255) NULL,
    `gender` VARCHAR(1) NULL,
    `age` INTEGER NULL,
    `education` VARCHAR(50) NULL,
    `occupation` VARCHAR(100) NULL,
    `submitted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `survey_responses_survey_id_submitted_at_idx`(`survey_id`, `submitted_at`),
    INDEX `survey_responses_registration_id_idx`(`registration_id`),
    UNIQUE INDEX `survey_responses_survey_id_registration_id_key`(`survey_id`, `registration_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_answers` (
    `id` VARCHAR(191) NOT NULL,
    `response_id` VARCHAR(191) NOT NULL,
    `question_id` VARCHAR(191) NOT NULL,
    `option_id` VARCHAR(191) NULL,
    `essay_text` TEXT NULL,
    `value` INTEGER NULL,

    INDEX `survey_answers_question_id_idx`(`question_id`),
    INDEX `survey_answers_option_id_idx`(`option_id`),
    UNIQUE INDEX `survey_answers_response_id_question_id_key`(`response_id`, `question_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `survey_options` ADD CONSTRAINT `survey_options_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `survey_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_items` ADD CONSTRAINT `survey_items_survey_id_fkey` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_items` ADD CONSTRAINT `survey_items_unsur_id_fkey` FOREIGN KEY (`unsur_id`) REFERENCES `survey_unsur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_items` ADD CONSTRAINT `survey_items_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `survey_questions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_survey_id_fkey` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_registration_id_fkey` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_response_id_fkey` FOREIGN KEY (`response_id`) REFERENCES `survey_responses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_question_id_fkey` FOREIGN KEY (`question_id`) REFERENCES `survey_questions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_option_id_fkey` FOREIGN KEY (`option_id`) REFERENCES `survey_options`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

