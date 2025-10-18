import { Types } from 'mongoose';

/**
 * Security utility functions for input validation and sanitization
 */

/**
 * Validates if a string is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Sanitizes and validates MongoDB ObjectId from request parameters
 */
export function sanitizeObjectId(id: string, fieldName: string = 'id'): string {
  if (!id || typeof id !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a non-empty string`);
  }
  
  if (!isValidObjectId(id)) {
    throw new Error(`Invalid ${fieldName}: must be a valid MongoDB ObjectId`);
  }
  
  return id.trim();
}

/**
 * Sanitizes string input to prevent NoSQL injection
 */
export function sanitizeString(input: any, fieldName: string = 'field'): string {
  if (input === null || input === undefined) {
    throw new Error(`Invalid ${fieldName}: cannot be null or undefined`);
  }
  
  if (typeof input !== 'string') {
    throw new Error(`Invalid ${fieldName}: must be a string`);
  }
  
  // Remove potentially dangerous characters
  const sanitized = input.trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/[$]/g, '') // Remove dollar signs (MongoDB operators)
    .replace(/[{}]/g, '') // Remove braces
    .replace(/[()]/g, '') // Remove parentheses
    .replace(/[\\]/g, '') // Remove backslashes
    .replace(/[\/]/g, '') // Remove forward slashes
    .replace(/[|]/g, '') // Remove pipes
    .replace(/[&]/g, '') // Remove ampersands
    .replace(/[`]/g, '') // Remove backticks
    .replace(/[~]/g, '') // Remove tildes
    .replace(/[!]/g, '') // Remove exclamation marks
    .replace(/[@]/g, '') // Remove at symbols
    .replace(/[#]/g, '') // Remove hash symbols
    .replace(/[%]/g, '') // Remove percent signs
    .replace(/[\^]/g, '') // Remove carets
    .replace(/[*]/g, '') // Remove asterisks
    .replace(/[+]/g, '') // Remove plus signs
    .replace(/[=]/g, '') // Remove equals signs
    .replace(/[[]/g, '') // Remove opening brackets
    .replace(/[\]]/g, '') // Remove closing brackets
    .replace(/[?]/g, '') // Remove question marks
    .replace(/[,]/g, '') // Remove commas
    .replace(/[.]/g, '') // Remove periods
    .replace(/[ ]/g, '') // Remove spaces
    .replace(/[\t]/g, '') // Remove tabs
    .replace(/[\n]/g, '') // Remove newlines
    .replace(/[\r]/g, ''); // Remove carriage returns
  
  if (sanitized.length === 0) {
    throw new Error(`Invalid ${fieldName}: cannot be empty after sanitization`);
  }
  
  return sanitized;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
  return email.toLowerCase().trim();
}

/**
 * Validates phone number format
 */
export function validatePhone(phone: string): string {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
    throw new Error('Invalid phone number format');
  }
  return phone.replace(/[\s\-\(\)]/g, '');
}

/**
 * Validates and sanitizes numeric input
 */
export function sanitizeNumber(input: any, fieldName: string = 'number', min?: number, max?: number): number {
  if (input === null || input === undefined) {
    throw new Error(`Invalid ${fieldName}: cannot be null or undefined`);
  }
  
  const num = Number(input);
  if (isNaN(num)) {
    throw new Error(`Invalid ${fieldName}: must be a valid number`);
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`Invalid ${fieldName}: must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`Invalid ${fieldName}: must be at most ${max}`);
  }
  
  return num;
}

/**
 * Validates date input
 */
export function validateDate(dateInput: any, fieldName: string = 'date'): Date {
  if (!dateInput) {
    throw new Error(`Invalid ${fieldName}: cannot be null or undefined`);
  }
  
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: must be a valid date`);
  }
  
  return date;
}

/**
 * Validates appointment type
 */
export function validateAppointmentType(type: any): 'video' | 'in-person' {
  if (!type || typeof type !== 'string') {
    throw new Error('Invalid appointment type: must be a string');
  }
  
  if (!['video', 'in-person'].includes(type)) {
    throw new Error('Invalid appointment type: must be "video" or "in-person"');
  }
  
  return type as 'video' | 'in-person';
}

/**
 * Validates appointment status
 */
export function validateAppointmentStatus(status: any): 'scheduled' | 'completed' | 'cancelled' | 'no-show' {
  if (!status || typeof status !== 'string') {
    throw new Error('Invalid appointment status: must be a string');
  }
  
  if (!['scheduled', 'completed', 'cancelled', 'no-show'].includes(status)) {
    throw new Error('Invalid appointment status: must be one of "scheduled", "completed", "cancelled", "no-show"');
  }
  
  return status as 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

/**
 * Validates user role
 */
export function validateUserRole(role: any): 'patient' | 'doctor' | 'admin' {
  if (!role || typeof role !== 'string') {
    throw new Error('Invalid user role: must be a string');
  }
  
  if (!['patient', 'doctor', 'admin'].includes(role)) {
    throw new Error('Invalid user role: must be one of "patient", "doctor", "admin"');
  }
  
  return role as 'patient' | 'doctor' | 'admin';
}

/**
 * Validates document type
 */
export function validateDocumentType(type: any): 'license' | 'certificate' | 'experience' {
  if (!type || typeof type !== 'string') {
    throw new Error('Invalid document type: must be a string');
  }
  
  if (!['license', 'certificate', 'experience'].includes(type)) {
    throw new Error('Invalid document type: must be one of "license", "certificate", "experience"');
  }
  
  return type as 'license' | 'certificate' | 'experience';
}

/**
 * Validates record type
 */
export function validateRecordType(type: any): 'lab_report' | 'prescription' | 'x_ray' | 'other' {
  if (!type || typeof type !== 'string') {
    throw new Error('Invalid record type: must be a string');
  }
  
  if (!['lab_report', 'prescription', 'x_ray', 'other'].includes(type)) {
    throw new Error('Invalid record type: must be one of "lab_report", "prescription", "x_ray", "other"');
  }
  
  return type as 'lab_report' | 'prescription' | 'x_ray' | 'other';
}

/**
 * Validates payment status
 */
export function validatePaymentStatus(status: any): 'pending' | 'completed' | 'failed' | 'refunded' {
  if (!status || typeof status !== 'string') {
    throw new Error('Invalid payment status: must be a string');
  }
  
  if (!['pending', 'completed', 'failed', 'refunded'].includes(status)) {
    throw new Error('Invalid payment status: must be one of "pending", "completed", "failed", "refunded"');
  }
  
  return status as 'pending' | 'completed' | 'failed' | 'refunded';
}

/**
 * Validates dispute status
 */
export function validateDisputeStatus(status: any): 'open' | 'in_progress' | 'resolved' | 'closed' {
  if (!status || typeof status !== 'string') {
    throw new Error('Invalid dispute status: must be a string');
  }
  
  if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
    throw new Error('Invalid dispute status: must be one of "open", "in_progress", "resolved", "closed"');
  }
  
  return status as 'open' | 'in_progress' | 'resolved' | 'closed';
}

/**
 * Sanitizes file name to prevent path traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('Invalid file name: must be a non-empty string');
  }
  
  // Remove path traversal attempts
  const sanitized = fileName
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[\/\\]/g, '') // Remove path separators
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '') // Remove control characters
    .trim();
  
  if (sanitized.length === 0) {
    throw new Error('Invalid file name: cannot be empty after sanitization');
  }
  
  return sanitized;
}

/**
 * Validates file size
 */
export function validateFileSize(size: number, maxSizeMB: number = 10): number {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (size > maxSizeBytes) {
    throw new Error(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
  }
  return size;
}

/**
 * Validates MIME type
 */
export function validateMimeType(mimeType: string, allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']): string {
  if (!mimeType || typeof mimeType !== 'string') {
    throw new Error('Invalid MIME type: must be a string');
  }
  
  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  return mimeType;
}
