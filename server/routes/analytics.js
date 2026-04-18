const express = require('express');
const db = require('../db');

const router = express.Router();
const DEMO_USER_ID = 'user-demo-001';

router.get('/', (req, res) => {
    try { const statusDist = db.prepare(`
    SELECT Status, COUNT(*) as count
    FROM Application
    WHERE UserID = ?
    GROUP BY Status
    ORDER BY count DESC
    `).all(DEMO_USER_ID);

    const stageOrder = ['Applied','Online Assessment','Phone Screen','Interview','Offer'];
    const allApps = db.prepare(`
        SELECT Status FROM Application WHERE UserID = ? AND Status != 'Wishlist'
        `).all(DEMO_USER_ID);
        
        const stageIndex = s => stageOrder.indexOf(s);
        const funnel = stageOrder.map((stage, i) => ({stage,
            count: allApps.filter(a => stageIndex(a.Status) >= i || a.Status === stage).length,
        }));

    const timeline = db.prepare(`
        SELECT
        strftime('%Y-W%W', Date_Applied) as week,
        COUNT(*) as count
        FROM Application
        WHERE UserID = ? AND Date_Applied IS NOT NULL
        GROUP BY week
        ORDER BY week ASC
        `).all(DEMO_USER_ID);
        const total      = allApps.length;
        const responded  = allApps.filter(a => !['Applied'].includes(a.Status)).length;
        const interviewed= allApps.filter(a => ['Interview','Offer'].includes(a.Status)).length;
        const offered    = allApps.filter(a => a.Status === 'Offer').length;
    res.json({
        totals: {
            total: db.prepare('SELECT COUNT(*) as n FROM Application WHERE UserID = ?').get(DEMO_USER_ID).n,
            responded,
            interviewed,
            offered,
            responseRate:   total ? Math.round(responded   / total * 100) : 0,
            interviewRate:  total ? Math.round(interviewed / total * 100) : 0,
            offerRate:      total ? Math.round(offered     / total * 100) : 0,},
            statusDistribution: statusDist,
            funnel,
            timeline,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to compute analytics.' });
    }
});

module.exports = router;