const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { validateCompany, validateContact } = require('../middleware/validate');

const router = express.Router();

router.get('/', (req, res) => {
    try {
        const companies = db.prepare('SELECT * FROM Company ORDER BY Name ASC').all();
        res.json(companies);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch companies.' });
    }
});

router.get('/:id', (req, res) => {
    try {
        const company = db.prepare('SELECT * FROM Company WHERE CompanyID = ?').get(req.params.id);
        if (!company) return res.status(404).json({ error: 'Company not found.' });

        company.roles    = db.prepare('SELECT * FROM Role    WHERE CompanyID = ?').all(req.params.id);
        company.contacts = db.prepare('SELECT * FROM Contact WHERE CompanyID = ?').all(req.params.id);

        res.json(company);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch company.' });
    }
});

router.post('/', validateCompany, (req, res) => {
    try {
        const { Name, Website, Industry, Location } = req.body;
        const id = uuidv4();
        db.prepare('INSERT INTO Company (CompanyID, Name, Website, Industry, Location) VALUES (?,?,?,?,?)')
        .run(id, Name.trim(), Website || null, Industry || null, Location || null);
        res.status(201).json(db.prepare('SELECT * FROM Company WHERE CompanyID = ?').get(id));
    } catch (err) {
        res.status(500).json({ error: 'Failed to create company.' });
    }
});

router.put('/:id', validateCompany, (req, res) => {
    try {
        const existing = db.prepare('SELECT * FROM Company WHERE CompanyID = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Company not found.' });
        const { Name, Website, Industry, Location } = req.body;
        db.prepare('UPDATE Company SET Name=?, Website=?, Industry=?, Location=? WHERE CompanyID=?')
        .run(Name.trim(), Website || null, Industry || null, Location || null, req.params.id);
        res.json(db.prepare('SELECT * FROM Company WHERE CompanyID = ?').get(req.params.id));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update company.' });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const existing = db.prepare('SELECT CompanyID FROM Company WHERE CompanyID = ?').get(req.params.id);
        if (!existing) return res.status(404).json({ error: 'Company not found.' });
        db.prepare('DELETE FROM Company WHERE CompanyID = ?').run(req.params.id);
        res.json({ message: 'Company deleted.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete company.' });
    }
});

module.exports = router;