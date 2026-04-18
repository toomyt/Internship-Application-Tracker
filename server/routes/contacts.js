const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { validateContact } = require('../middleware/validate');

const router = express.Router();

router.get('/', (req, res) => {
    try {
        const { companyId } = req.query;
        const contacts = companyId
        ? db.prepare('SELECT * FROM Contact WHERE CompanyID = ?').all(companyId)
        : db.prepare('SELECT * FROM Contact ORDER BY Full_Name ASC').all();
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch contacts.' });
    }
});

router.post('/', validateContact, (req, res) => {
    try {
        const { Full_Name, Email, Phone, LinkedIn_URL, Position, CompanyID } = req.body;
        const id = uuidv4();
        db.prepare('INSERT INTO Contact (ContactID, Full_Name, Email, Phone, LinkedIn_URL, Position, CompanyID) VALUES (?,?,?,?,?,?,?)')
        .run(id, Full_Name.trim(), Email || null, Phone || null, LinkedIn_URL || null, Position || null, CompanyID);
        res.status(201).json(db.prepare('SELECT * FROM Contact WHERE ContactID = ?').get(id));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create contact.' });
    }
});

router.put('/:id', validateContact, (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM Contact WHERE ContactID = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Contact not found.' });
        const { Full_Name, Email, Phone, LinkedIn_URL, Position, CompanyID } = req.body;
        db.prepare('UPDATE Contact SET Full_Name=?, Email=?, Phone=?, LinkedIn_URL=?, Position=?, CompanyID=? WHERE ContactID=?')
        .run(Full_Name.trim(), Email || null, Phone || null, LinkedIn_URL || null, Position || null, CompanyID, req.params.id);
        res.json(db.prepare('SELECT * FROM Contact WHERE ContactID = ?').get(req.params.id));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update contact.' });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT ContactID FROM Contact WHERE ContactID = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Contact not found.' });
        db.prepare('DELETE FROM Contact WHERE ContactID = ?').run(req.params.id);
        res.json({ message: 'Contact deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete contact.' });
    }
});

module.exports = router;