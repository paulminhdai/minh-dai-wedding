// Request validation middleware using express-validator
const { body, query, param, validationResult } = require('express-validator');

/**
 * Validation error handler
 * Returns validation errors in a consistent format
 */
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
}

/**
 * RSVP validation rules
 */
const validateRSVP = [
    body('names')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters')
        .matches(/^[a-zA-Z\s\-'\.]+$/).withMessage('Name contains invalid characters'),
    
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^[\d\s\-\(\)\+\.]+$/).withMessage('Invalid phone number format')
        .isLength({ min: 10, max: 20 }).withMessage('Phone number must be between 10 and 20 characters'),
    
    body('attending')
        .notEmpty().withMessage('Attendance status is required')
        .isIn(['yes', 'no']).withMessage('Attendance must be "yes" or "no"'),
    
    body('guests')
        .optional()
        .isInt({ min: 1, max: 8 }).withMessage('Guest count must be between 1 and 8'),
    
    body('dietary')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Dietary restrictions must be less than 500 characters'),
    
    body('message')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Message must be less than 1000 characters'),
    
    body('guestCode')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('Guest code must be less than 50 characters'),
    
    handleValidationErrors
];

/**
 * Admin login validation rules
 */
const validateLogin = [
    body('password')
        .notEmpty().withMessage('Password is required')
        .isString().withMessage('Password must be a string')
        .isLength({ min: 1, max: 200 }).withMessage('Invalid password format'),
    
    handleValidationErrors
];

/**
 * Guest name validation rules
 */
const validateGuestName = [
    body('name')
        .trim()
        .notEmpty().withMessage('Guest name is required')
        .isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters')
        .matches(/^[a-zA-Z\s\-'\.]+$/).withMessage('Name contains invalid characters'),
    
    body('side')
        .optional()
        .isIn(['bride', 'groom', 'mutual']).withMessage('Side must be bride, groom, or mutual'),
    
    handleValidationErrors
];

/**
 * RSVP ID validation rules (for delete operations)
 */
const validateRSVPId = [
    param('id')
        .notEmpty().withMessage('RSVP ID is required')
        .isUUID().withMessage('Invalid RSVP ID format'),
    
    handleValidationErrors
];

/**
 * Guest search validation rules
 */
const validateGuestSearch = [
    query('q')
        .trim()
        .notEmpty().withMessage('Search query is required')
        .isLength({ min: 2, max: 100 }).withMessage('Search query must be between 2 and 100 characters'),
    
    handleValidationErrors
];

/**
 * Generic UUID validation for params
 */
const validateUUID = (paramName = 'id') => [
    param(paramName)
        .notEmpty().withMessage(`${paramName} is required`)
        .isUUID().withMessage(`Invalid ${paramName} format`),
    
    handleValidationErrors
];

/**
 * Validate guest name in URL params
 */
const validateGuestNameParam = [
    param('name')
        .trim()
        .notEmpty().withMessage('Guest name is required')
        .isLength({ min: 1, max: 200 }).withMessage('Invalid guest name'),
    
    handleValidationErrors
];

module.exports = {
    validateRSVP,
    validateLogin,
    validateGuestName,
    validateRSVPId,
    validateGuestSearch,
    validateUUID,
    validateGuestNameParam,
    handleValidationErrors
};
