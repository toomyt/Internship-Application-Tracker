const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

const VALID_DOC_TYPES = ['Resume', 'Cover Letter', 'Portfolio', 'Other'];

router.get('/', (req, res) => {
    try {
        const { applicationId } = req.query;
        if (!applicationId) return res.status(400).json({ error: 'applicationId query param required.' });
        const docs = db.prepare('SELECT * FROM Document WHERE ApplicationID = ?').all(applicationId);
        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch documents.' });
    }
});

router.post('/', (req, res) => {
    try {
        const { Name, Doc_Type = 'Other', URL, ApplicationID } = req.body;
        if (!Name || !ApplicationID) {
        return res.status(400).json({ error: 'Name and ApplicationID are required.' });
        }
        if (!VALID_DOC_TYPES.includes(Doc_Type)) {
        return res.status(400).json({ error: `Doc_Type must be one of: ${VALID_DOC_TYPES.join(', ')}` });
        }
        const id = uuidv4();
        db.prepare('INSERT INTO Document (DocumentID, Name, Doc_Type, URL, ApplicationID) VALUES (?,?,?,?,?)')
        .run(id, Name.trim(), Doc_Type, URL || null, ApplicationID);
        res.status(201).json(db.prepare('SELECT * FROM Document WHERE DocumentID = ?').get(id));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create document.' });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const doc = db.prepare('SELECT DocumentID FROM Document WHERE DocumentID = ?').get(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Document not found.' });
        db.prepare('DELETE FROM Document WHERE DocumentID = ?').run(req.params.id);
        res.json({ message: 'Document deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete document.' });
    }
});

module.exports = router;