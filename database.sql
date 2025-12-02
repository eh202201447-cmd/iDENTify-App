CREATE DATABASE IF NOT EXISTS `identify_app`;

USE `identify_app`;

CREATE TABLE IF NOT EXISTS `dentists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `specialty` VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `patients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `birthdate` DATE,
  `gender` VARCHAR(50),
  `address` TEXT,
  `contact_number` VARCHAR(50),
  `email` VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `dentist_id` INT,
  `appointment_datetime` DATETIME,
  `reason` TEXT,
  `notes` TEXT,
  `status` VARCHAR(50),
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `walk_in_queue` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `appointment_id` INT NULL,
  `dentist_id` INT NULL,
  `source` VARCHAR(50),
  `status` VARCHAR(50),
  `notes` TEXT,
  `time_added` DATETIME,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE SET NULL
);

-- You can optionally insert the initial dentist data
INSERT INTO `dentists` (`name`, `specialty`) VALUES
('Dr. Paul Zaragoza', 'General Dentist'),
('Dr. Erica Aquino', 'Orthodontist'),
('Dr. Hernane Benedicto', 'Prosthodontist');

-- New tables for Patient Form sections

CREATE TABLE IF NOT EXISTS `tooth_conditions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `cell_key` VARCHAR(255) NOT NULL,
  `condition_code` VARCHAR(10),
  `status` VARCHAR(50),
  `is_shaded` BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `treatment_timeline` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `start_time` VARCHAR(255),
  `end_time` VARCHAR(255),
  `provider` VARCHAR(255),
  `procedure_text` TEXT,
  `notes` TEXT,
  `image_url` VARCHAR(255),
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `medications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `medicine` VARCHAR(255) NOT NULL,
  `dosage` VARCHAR(255),
  `frequency` VARCHAR(255),
  `notes` TEXT,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);

-- Sample data for a patient (assuming patient with id=1 exists)

-- Tooth conditions
INSERT INTO `tooth_conditions` (`patient_id`, `cell_key`, `condition_code`, `status`, `is_shaded`) VALUES
(1, 'box-18', 'F', 'completed', 0),
(1, 'circle-10', NULL, 'completed', 1);

-- Treatment timeline
INSERT INTO `treatment_timeline` (`patient_id`, `start_time`, `end_time`, `provider`, `procedure_text`, `notes`) VALUES
(1, '09:05', '09:20', 'Dr. Paul Zaragoza', 'Cleaning', 'Patient was cooperative.');

-- Medications
INSERT INTO `medications` (`patient_id`, `medicine`, `dosage`, `frequency`, `notes`) VALUES
(1, 'Ibuprofen', '400mg', 'q8h', 'After meals');
