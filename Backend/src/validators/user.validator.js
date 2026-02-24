import { body, param } from 'express-validator';
import { GENDER } from '../constants/index.js';

/**
 * Update profile validation rules
 */
export const updateProfileValidation = [
  body('fullName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('phone')
    .optional({ checkFalsy: true })
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number'),

  body('age')
    .optional({ checkFalsy: true })
    .isInt({ min: 18, max: 120 })
    .withMessage('Age must be between 18 and 120'),

  body('gender')
    .optional({ checkFalsy: true })
    .isIn(Object.values(GENDER))
    .withMessage('Invalid gender value'),

  body('location.address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),

  body('location.city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('location.state')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),

  body('location.country')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),

  body('location.zipCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Zip code cannot exceed 20 characters'),

  body('location.postalCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),
];

/**
 * Complete profile validation (for OAuth users)
 */
export const completeProfileValidation = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['caregiver', 'careseeker'])
    .withMessage('Role must be either caregiver or careseeker'),

  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number'),

  body('age')
    .notEmpty()
    .withMessage('Age is required')
    .isInt({ min: 18, max: 120 })
    .withMessage('Age must be between 18 and 120'),

  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(Object.values(GENDER))
    .withMessage('Invalid gender value'),
];

/**
 * User ID param validation
 */
export const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
];
