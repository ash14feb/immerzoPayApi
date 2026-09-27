const { addCorsHeaders, handleCorsPreflight } = require('../../utils/cors');
const { query } = require('../../lib/db');
const { validateSalesData } = require('../../utils/validation');

module.exports = async function handler(req, res) {
    // Handle CORS
    if (handleCorsPreflight(req, res)) return;

    if (req.method !== 'POST') {
        addCorsHeaders(res, req.headers.origin || "*");
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const salesData = req.body;

        // Validate input
        const { error, value } = validateSalesData(salesData);

        if (error) {
            addCorsHeaders(res, req.headers.origin || "*");
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.details.map(detail => detail.message)
            });
        }

        // Prepare data for insertion
        const { ThemeName, Amount, PhotoURL, OriginalImageURL, DateTime } = value;

        const result = await query(
            `INSERT INTO PhotoAISales (ThemeName, Amount, PhotoURL, OriginalImageURL, DateTime) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                ThemeName,
                Amount,
                PhotoURL,
                OriginalImageURL || null, // Store as NULL if empty
                DateTime || new Date().toISOString().slice(0, 19).replace('T', ' ')
            ]
        );

        // Fetch the created record
        const [newSale] = await query(
            'SELECT * FROM PhotoAISales WHERE ID = ?',
            [result.insertId]
        );

        addCorsHeaders(res, req.headers.origin || "*");
        res.status(201).json({
            success: true,
            message: 'Sale record created successfully',
            data: newSale
        });

    } catch (error) {
        console.error('Error creating sale:', error);
        addCorsHeaders(res, req.headers.origin || "*");
        res.status(500).json({
            success: false,
            error: 'Failed to create sale record',
            details: error.message
        });
    }
}