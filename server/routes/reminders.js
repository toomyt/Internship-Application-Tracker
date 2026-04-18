const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { validateReminder } = require('../middleware/validate');

const router = express.Router();

router.get('/', (req, res) => {
    try {
        const { applicationId, upcoming } = req.query;
        let query, params;

        if (applicationId) {
        query  = 'SELECT * FROM Reminder WHERE ApplicationID = ? ORDER BY Due_Date ASC';
        params = [applicationId];
        } else {
        query = `
            SELECT r.*, a.ApplicationID, c.Name as CompanyName, ro.Title as RoleTitle
            FROM Reminder r
            JOIN Application a ON r.ApplicationID = a.ApplicationID
            JOIN Role ro ON a.RoleID = ro.RoleID
            JOIN Company c ON ro.CompanyID = c.CompanyID
            WHERE a.UserID = ? AND r.Completed = 0
            ORDER BY r.Due_Date ASC
        `;
        params = ['user-demo-001'];
    }

    if (upcoming === 'true') {
        query = query.replace('ORDER BY', 'AND r.Due_Date >= date("now") ORDER BY');
    }
    const reminders = db.prepare(query).all(...params);
    res.json(reminders);
} catch (err) {
    res.status(500).json({ error: 'Failed to fetch reminders.' });
}
});

router.post('/', validateReminder, (req, res) => {
    try {
        const { Due_Date, Reminder_Type, ApplicationID } = req.body;
        const id = uuidv4();
        db.prepare('INSERT INTO Reminder (ReminderID, Due_Date, Reminder_Type, ApplicationID) VALUES (?,?,?,?)')
        .run(id, Due_Date, Reminder_Type, ApplicationID);
        const reminder = db.prepare('SELECT * FROM Reminder WHERE ReminderID = ?').get(id);
        res.status(201).json(reminder);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create reminder.' });
    }
});

router.patch('/:id/complete', (req, res) => {
    try {
        const reminder = db.prepare('SELECT * FROM Reminder WHERE ReminderID = ?').get(req.params.id);
        if (!reminder) return res.status(404).json({ error: 'Reminder not found.' });
        const newVal = reminder.Completed === 0 ? 1 : 0;
        db.prepare('UPDATE Reminder SET Completed = ? WHERE ReminderID = ?').run(newVal, req.params.id);
        res.json({ ...reminder, Completed: newVal });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update reminder.' });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const reminder = db.prepare('SELECT ReminderID FROM Reminder WHERE ReminderID = ?').get(req.params.id);
        if (!reminder) return res.status(404).json({ error: 'Reminder not found.' });
        db.prepare('DELETE FROM Reminder WHERE ReminderID = ?').run(req.params.id);
        res.json({ message: 'Reminder deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete reminder.' });
    }
});

module.exports = router;