const express = require('express');
const cors    = require('cors');

const db = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*', // Tighten this to your frontend URL in production
}));
app.use(express.json());

app.use('/api/applications', require('./routes/applications'));
app.use('/api/companies',    require('./routes/companies'));
app.use('/api/contacts',     require('./routes/contacts'));
app.use('/api/notes',        require('./routes/notes'));
app.use('/api/reminders',    require('./routes/reminders'));
app.use('/api/documents',    require('./routes/documents'));
app.use('/api/analytics',    require('./routes/analytics'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});


app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 ApplyTrack API running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});