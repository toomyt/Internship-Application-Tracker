const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { validateNote } = require('../middleware/validate');

const router = express.Router();

router.get('/', (req, res) => {
    try {
        const { applicationId } = req.query;
        if (!applicationId) return res.status(400).json({ error: 'applicationId query param required.' });
        const notes = db.prepare('SELECT * FROM Note WHERE ApplicationID = ? ORDER BY Created_At DESC').all(applicationId);
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notes.' });
    }
});

router.post('/', validateNote, (req, res) => {
    try {
        const { Content, Note_Type = 'General', ApplicationID } = req.body;
        const id = uuidv4();
        db.prepare('INSERT INTO Note (NoteID, Content, Note_Type, ApplicationID) VALUES (?,?,?,?)')
        .run(id, Content.trim(), Note_Type, ApplicationID);
        const note = db.prepare('SELECT * FROM Note WHERE NoteID = ?').get(id);
        res.status(201).json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create note.' });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const note = db.prepare('SELECT NoteID FROM Note WHERE NoteID = ?').get(req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found.' });
        db.prepare('DELETE FROM Note WHERE NoteID = ?').run(req.params.id);
        res.json({ message: 'Note deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete note.' });
    }
});

module.exports = router;