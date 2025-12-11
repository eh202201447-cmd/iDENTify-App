CREATE DATABASE IF NOT EXISTS `identify_app`;

USE `identify_app`;

-- DENTISTS TABLE
-- Stores dentist profiles, current status, and working schedule
CREATE TABLE IF NOT EXISTS `dentists` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `specialty` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT 'Available',
  `schedule` JSON
);

-- PATIENTS TABLE
-- Stores patient personal info, vitals, and gallery images
CREATE TABLE IF NOT EXISTS `patients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `birthdate` DATE,
  `gender` VARCHAR(50),
  `address` TEXT,
  `contact_number` VARCHAR(50),
  `email` VARCHAR(255),
  `medical_alerts` TEXT,
  `vitals` JSON,
  `parent_id` INT,
  `xrays` LONGTEXT, -- Handles large base64 strings for general gallery
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`parent_id`) REFERENCES `patients`(`id`) ON DELETE SET NULL
);

-- APPOINTMENTS TABLE
-- Stores scheduled bookings
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `dentist_id` INT,
  `appointment_datetime` DATETIME,
  `end_datetime` DATETIME,
  `reason` TEXT,
  `notes` TEXT,
  `status` VARCHAR(50),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`dentist_id`) REFERENCES `dentists`(`id`) ON DELETE SET NULL
);

-- QUEUE TABLE
-- Manages the live clinic flow (Walk-ins & Checked-in Appointments)
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

-- TOOTH CONDITIONS TABLE
-- Stores the visual charting data (Red boxes, Blue circles, etc.)
CREATE TABLE IF NOT EXISTS `tooth_conditions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `cell_key` VARCHAR(255) NOT NULL,
  `condition_code` VARCHAR(10),
  `status` VARCHAR(50),
  `is_shaded` BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);

-- TREATMENT TIMELINE TABLE
-- Stores the specific history records displayed in the Mobile App
CREATE TABLE IF NOT EXISTS `treatment_timeline` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `start_time` VARCHAR(255),
  `end_time` VARCHAR(255),
  `provider` VARCHAR(255),
  `procedure_text` TEXT,
  `notes` TEXT,
  `image_url` LONGTEXT, -- FIXED: Changed from VARCHAR(255) to LONGTEXT to support images
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);

-- MEDICATIONS TABLE
-- Stores prescriptions
CREATE TABLE IF NOT EXISTS `medications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patient_id` INT,
  `medicine` VARCHAR(255) NOT NULL,
  `dosage` VARCHAR(255),
  `frequency` VARCHAR(255),
  `notes` TEXT,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE CASCADE
);

-- INITIAL DATA SEEDING
-- Default dentists with schedules
INSERT INTO `dentists` (`name`, `specialty`, `status`, `schedule`) VALUES
('Dr. Paul Zaragoza', 'General Dentist', 'Available', '{"days": [1,3,5], "operatingHours": {"start": "09:00", "end": "17:30"}, "lunch": {"start": "12:30", "end": "13:15"}, "breaks": [], "leaveDays": []}'),
('Dr. Erica Aquino', 'Orthodontist', 'Available', '{"days": [2,4], "operatingHours": {"start": "10:00", "end": "18:00"}, "lunch": {"start": "13:00", "end": "14:00"}, "breaks": [], "leaveDays": []}'),
('Dr. Hernane Benedicto', 'Prosthodontist', 'Available', '{"days": [1,2,3,4,5], "operatingHours": {"start": "08:30", "end": "17:00"}, "lunch": {"start": "12:00", "end": "12:45"}, "breaks": [], "leaveDays": []}');