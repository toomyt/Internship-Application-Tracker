const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { validateApplication } = require('../middleware/validate');

const router = express.Router();

const DEMO_USER_ID = 'user-demo-001';

router.get('/', (req, res) => {
    try {
        const { status, priority, search, sort } = req.query;
        let query = `
        SELECT
        a.ApplicationID, a.Date_Applied, a.Status, a.Priority, a.Notes,
        a.CreatedAt, a.UpdatedAt,
        r.RoleID, r.Title as RoleTitle, r.Location as RoleLocation,
        r.PostingURL, r.InternshipTerm,
        c.CompanyID, c.Name as CompanyName, c.Website, c.Industry, c.Location as CompanyLocation
        FROM Application a
        JOIN Role    r ON a.RoleID    = r.RoleID
        JOIN Company c ON r.CompanyID = c.CompanyID
        WHERE a.UserID = ?
    `;

    const params = [DEMO_USER_ID];

    if (status) {
        query += ' AND a.Status = ?';
        params.push(status);
    }
    if (priority) {
        query += ' AND a.Priority = ?';
        params.push(priority);
    }
    if (search) {
        query += ' AND (c.Name LIKE ? OR r.Title LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    const validSorts = {
        'date-desc':  'a.Date_Applied DESC',
        'date-asc':   'a.Date_Applied ASC',
        'company':    'c.Name ASC',
        'status':     'a.Status ASC',
    };
    query += ` ORDER BY ${validSorts[sort] || validSorts['date-desc']}`;

    const applications = db.prepare(query).all(...params);

    const getNotes     = db.prepare('SELECT * FROM Note     WHERE ApplicationID = ? ORDER BY Created_At DESC');
    const getReminders = db.prepare('SELECT * FROM Reminder WHERE ApplicationID = ? ORDER BY Due_Date ASC');
    const getDocs      = db.prepare('SELECT * FROM Document WHERE ApplicationID = ?');

    const enriched = applications.map(app => ({
        ...app,
        notes:     getNotes.all(app.ApplicationID),
        reminders: getReminders.all(app.ApplicationID),
        documents: getDocs.all(app.ApplicationID),
    }));

    res.json(enriched);
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch applications.' });
}
});

router.get('/:id', (req, res) => {
    try {
        const app = db.prepare(`
        SELECT
        a.ApplicationID, a.Date_Applied, a.Status, a.Priority, a.Notes,
        a.CreatedAt, a.UpdatedAt,
        r.RoleID, r.Title as RoleTitle, r.Location as RoleLocation,
        r.PostingURL, r.InternshipTerm,
        c.CompanyID, c.Name as CompanyName, c.Website, c.Industry, c.Location as CompanyLocation
        FROM Application a
        JOIN Role    r ON a.RoleID    = r.RoleID
        JOIN Company c ON r.CompanyID = c.CompanyID
        WHERE a.ApplicationID = ? AND a.UserID = ?
    `).get(req.params.id, DEMO_USER_ID);

    if (!app) return res.status(404).json({ error: 'Application not found.' });

    app.notes     = db.prepare('SELECT * FROM Note     WHERE ApplicationID = ? ORDER BY Created_At DESC').all(app.ApplicationID);
    app.reminders = db.prepare('SELECT * FROM Reminder WHERE ApplicationID = ? ORDER BY Due_Date ASC').all(app.ApplicationID);
    app.documents = db.prepare('SELECT * FROM Document WHERE ApplicationID = ?').all(app.ApplicationID);

    res.json(app);
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch application.' });
}
});

router.post('/', validateApplication, (req, res) => {
    try {
        const {
        RoleID,
        CompanyName, CompanyWebsite, CompanyIndustry, CompanyLocation,
        RoleTitle, RoleLocation, PostingURL, InternshipTerm,
        Date_Applied, Status = 'Applied', Priority = 'Medium', Notes = '',
    } = req.body;

    let resolvedRoleID = RoleID;

    if (!resolvedRoleID) {
        if (!CompanyName || !RoleTitle) {
            return res.status(400).json({ error: 'Provide either RoleID, or both CompanyName and RoleTitle.' });
        }

        let company = db.prepare('SELECT CompanyID FROM Company WHERE Name = ? COLLATE NOCASE').get(CompanyName);
        if (!company) {
            const newCompID = uuidv4();
            db.prepare('INSERT INTO Company (CompanyID, Name, Website, Industry, Location) VALUES (?,?,?,?,?)')
            .run(newCompID, CompanyName.trim(), CompanyWebsite || null, CompanyIndustry || null, CompanyLocation || null);
            company = { CompanyID: newCompID };
        }
        const newRoleID = uuidv4();
        db.prepare('INSERT INTO Role (RoleID, Title, Location, PostingURL, InternshipTerm, CompanyID) VALUES (?,?,?,?,?,?)')
        .run(newRoleID, RoleTitle.trim(), RoleLocation || null, PostingURL || null, InternshipTerm || null, company.CompanyID);
        resolvedRoleID = newRoleID;
    }

    const appID = uuidv4();
    db.prepare(`
        INSERT INTO Application (ApplicationID, Date_Applied, Status, Priority, Notes, UserID, RoleID)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(appID, Date_Applied || null, Status, Priority, Notes, DEMO_USER_ID, resolvedRoleID);
    
    const created = db.prepare(`
        SELECT a.*, r.Title as RoleTitle, r.Location as RoleLocation, r.PostingURL, r.InternshipTerm,
                c.CompanyID, c.Name as CompanyName, c.Website, c.Industry, c.Location as CompanyLocation
        FROM Application a
        JOIN Role r ON a.RoleID = r.RoleID
        JOIN Company c ON r.CompanyID = c.CompanyID
        WHERE a.ApplicationID = ?
    `).get(appID);
    
    created.notes = []; created.reminders = []; created.documents = [];
    
    res.status(201).json(created);
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create application.' });
}
});

router.put('/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM Application WHERE ApplicationID = ? AND UserID = ?')
        .get(req.params.id, DEMO_USER_ID);
        if (!existing) return res.status(404).json({ error: 'Application not found.' });
        
        const {
            Status    = existing.Status,
            Priority  = existing.Priority,
            Notes     = existing.Notes,
            Date_Applied = existing.Date_Applied,
        } = req.body;

    db.prepare(`
        UPDATE Application
        SET Status = ?, Priority = ?, Notes = ?, Date_Applied = ?, UpdatedAt = datetime('now')
        WHERE ApplicationID = ?
        `).run(Status, Priority, Notes, Date_Applied, req.params.id);
        
        const updated = db.prepare(`
            SELECT a.*, r.Title as RoleTitle, r.Location as RoleLocation, r.PostingURL, r.InternshipTerm,
                c.CompanyID, c.Name as CompanyName, c.Website, c.Industry, c.Location as CompanyLocation
        FROM Application a
        JOIN Role r ON a.RoleID = r.RoleID
        JOIN Company c ON r.CompanyID = c.CompanyID
        WHERE a.ApplicationID = ?
        `).get(req.params.id);

    updated.notes     = db.prepare('SELECT * FROM Note     WHERE ApplicationID = ?').all(req.params.id);
    updated.reminders = db.prepare('SELECT * FROM Reminder WHERE ApplicationID = ?').all(req.params.id);
    updated.documents = db.prepare('SELECT * FROM Document WHERE ApplicationID = ?').all(req.params.id);

    res.json(updated);
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update application.' });
}
});

router.delete('/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT ApplicationID FROM Application WHERE ApplicationID = ? AND UserID = ?')
        .get(req.params.id, DEMO_USER_ID);
        if (!existing) return res.status(404).json({ error: 'Application not found.' });
        db.prepare('DELETE FROM Application WHERE ApplicationID = ?').run(req.params.id);
        res.json({ message: 'Application deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete application.' });
    }
});

module.exports = router;