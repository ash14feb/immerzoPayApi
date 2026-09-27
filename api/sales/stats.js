
const { addCorsHeaders, handleCorsPreflight } = require('../../utils/cors');
const { query } = require('../../lib/db');

module.exports = async function handler(req, res) {
    // Handle CORS
    if (handleCorsPreflight(req, res)) return;

    if (req.method !== 'GET') {
        addCorsHeaders(res, req.headers.origin || "*");
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { period = 'month' } = req.query; // day, week, month, year

        // Get total sales
        const [totalResult] = await query(
            'SELECT COUNT(*) as count, SUM(Amount) as total FROM PhotoAISales'
        );

        // Get sales by theme
        const themeStats = await query(
            'SELECT ThemeName, COUNT(*) as count, SUM(Amount) as total FROM PhotoAISales GROUP BY ThemeName ORDER BY total DESC'
        );

        // Get recent sales
        const recentSales = await query(
            'SELECT * FROM PhotoAISales ORDER BY DateTime DESC LIMIT 10'
        );

        // Get daily/monthly trends
        let trendQuery = '';
        if (period === 'day') {
            trendQuery = `SELECT DATE(DateTime) as date, COUNT(*) as count, SUM(Amount) as total 
                         FROM PhotoAISales 
                         WHERE DateTime >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
                         GROUP BY DATE(DateTime) 
                         ORDER BY date`;
        } else if (period === 'month') {
            trendQuery = `SELECT DATE_FORMAT(DateTime, '%Y-%m') as month, COUNT(*) as count, SUM(Amount) as total 
                         FROM PhotoAISales 
                         GROUP BY DATE_FORMAT(DateTime, '%Y-%m') 
                         ORDER BY month DESC LIMIT 12`;
        }

        const trendStats = trendQuery ? await query(trendQuery) : [];

        addCorsHeaders(res, req.headers.origin || "*");
        res.status(200).json({
            success: true,
            stats: {
                total: totalResult,
                byTheme: themeStats,
                recent: recentSales,
                trends: trendStats
            }
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        addCorsHeaders(res, req.headers.origin || "*");
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            details: error.message
        });
    }
}