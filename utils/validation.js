const Joi = require('joi');

const salesSchema = Joi.object({
    ThemeName: Joi.string()
        .min(2)
        .max(255)
        .required()
        .messages({
            'string.empty': 'Theme name is required',
            'string.min': 'Theme name must be at least 2 characters long',
            'string.max': 'Theme name must be less than 255 characters'
        }),

    Amount: Joi.number()
        .required()
        .messages({
            'number.base': 'Amount must be a number',
            'any.required': 'Amount is required'
        }),

    PhotoURL: Joi.string()
        .uri()
        .max(500)
        .required()
        .messages({
            'string.uri': 'Photo URL must be a valid URL',
            'string.empty': 'Photo URL is required',
            'string.max': 'Photo URL must be less than 500 characters'
        }),

    OriginalImageURL: Joi.string()
        .uri()
        .max(500)
        .optional()
        .allow('')
        .messages({
            'string.uri': 'Original Image URL must be a valid URL',
            'string.max': 'Original Image URL must be less than 500 characters'
        }),

    DateTime: Joi.date()
        .iso()
        .optional()
        .messages({
            'date.base': 'DateTime must be a valid date',
            'date.format': 'DateTime must be in ISO format (YYYY-MM-DDTHH:mm:ss)'
        })
});

const validateSalesData = (data) => {
    return salesSchema.validate(data, { abortEarly: false });
};

module.exports = { salesSchema, validateSalesData };

// ---- Cashfree PG order validation (UPI, cards, netbanking all go through same order;
// payment_method chosen on frontend via payment_session_id) ----
const orderSchema = Joi.object({
    order_amount: Joi.number().positive().max(10000000).required(),
    order_currency: Joi.string().default('INR'),
    order_id: Joi.string().max(50).optional(), // your own id; Cashfree returns cf_order_id
    customer_details: Joi.object({
        customer_id: Joi.string().required(),
        customer_email: Joi.string().email().optional(),
        customer_phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
        customer_name: Joi.string().optional(),
    }).required(),
    order_meta: Joi.object({
        // Cashfree allows "{order_id}" template placeholder, which is not a valid URI —
        // validate with the placeholder substituted.
        return_url: Joi.string().max(1000).optional().custom((v, h) => {
            const probe = v.replace(/\{order_id\}/g, 'ORDER_ID');
            const { error } = Joi.string().uri().validate(probe);
            if (error) return h.error('string.uri');
            return v;
        }).messages({ 'string.uri': '"order_meta.return_url" must be a valid uri (may include {order_id})' }),
        notify_url: Joi.string().uri().optional(),
        payment_methods: Joi.string().optional(), // e.g. "cc,dc,upi,nb" to restrict
    }).optional(),
    order_note: Joi.string().max(500).optional(),
});

const validateOrderData = (data) => orderSchema.validate(data, { abortEarly: false });

module.exports.validateOrderData = validateOrderData;
module.exports.orderSchema = orderSchema;