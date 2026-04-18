const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'applytrack.db'), {
    verbose: process.env.NODE_ENV !== 'production' ? console.log : null,
});

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL'); // Better concurrent read performance

db.exec(`
    CREATE TABLE IF NOT EXISTS User (
    UserID    TEXT PRIMARY KEY,
    Name      TEXT NOT NULL,
    Email     TEXT NOT NULL UNIQUE,
    CreatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Company (
    CompanyID TEXT PRIMARY KEY,
    Name      TEXT NOT NULL,
    Website   TEXT,
    Industry  TEXT,
    Location  TEXT
    );

    CREATE TABLE IF NOT EXISTS Role (
    RoleID         TEXT PRIMARY KEY,
    Title          TEXT NOT NULL,
    Location       TEXT,
    PostingURL     TEXT,
    InternshipTerm TEXT,
    CompanyID      TEXT NOT NULL,
    FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Application (
    ApplicationID TEXT PRIMARY KEY,
    Date_Applied  TEXT,
    Status        TEXT NOT NULL DEFAULT 'Applied'
                CHECK(Status IN (
                    'Wishlist','Applied','Online Assessment',
                    'Phone Screen','Interview','Offer','Rejected','Withdrawn'
                    )),
    Priority      TEXT DEFAULT 'Medium'
                    CHECK(Priority IN ('Low','Medium','High')),
    Notes         TEXT,
    UserID        TEXT NOT NULL,
    RoleID        TEXT NOT NULL,
    CreatedAt     TEXT NOT NULL DEFAULT (datetime('now')),
    UpdatedAt     TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (UserID) REFERENCES User(UserID) ON DELETE CASCADE,
    FOREIGN KEY (RoleID) REFERENCES Role(RoleID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Contact (
    ContactID    TEXT PRIMARY KEY,
    Full_Name    TEXT NOT NULL,
    Email        TEXT,
    Phone        TEXT,
    LinkedIn_URL TEXT,
    Position     TEXT,
    CompanyID    TEXT NOT NULL,
    FOREIGN KEY (CompanyID) REFERENCES Company(CompanyID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Note (
    NoteID        TEXT PRIMARY KEY,
    Content       TEXT NOT NULL,
    Created_At    TEXT NOT NULL DEFAULT (datetime('now')),
    Note_Type     TEXT DEFAULT 'General'
                    CHECK(Note_Type IN ('General','Interview','Follow-up','Offer','Other')),
    ApplicationID TEXT NOT NULL,
    FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Reminder (
    ReminderID    TEXT PRIMARY KEY,
    Due_Date      TEXT NOT NULL,
    Reminder_Type TEXT NOT NULL
                    CHECK(Reminder_Type IN (
                    'Application Deadline','Follow-up',
                    'Interview','Offer Deadline','Other'
                    )),
    Completed     INTEGER NOT NULL DEFAULT 0
                    CHECK(Completed IN (0, 1)),
    ApplicationID TEXT NOT NULL,
    FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Document (
    DocumentID    TEXT PRIMARY KEY,
    Name          TEXT NOT NULL,
    Doc_Type      TEXT DEFAULT 'Other'
                    CHECK(Doc_Type IN ('Resume','Cover Letter','Portfolio','Other')),
    URL           TEXT,
    ApplicationID TEXT NOT NULL,
    FOREIGN KEY (ApplicationID) REFERENCES Application(ApplicationID) ON DELETE CASCADE
    );
`);

// ─── Seed a demo user if the database is empty ────────────────────────────────
const { v4: uuidv4 } = require('uuid');

const userCount = db.prepare('SELECT COUNT(*) as count FROM User').get();
if (userCount.count === 0) {
    console.log('🌱 Seeding demo data...');

    const userId  = 'user-demo-001';
    const compId1 = uuidv4();
    const compId2 = uuidv4();
    const compId3 = uuidv4();
    const roleId1 = uuidv4();
    const roleId2 = uuidv4();
    const roleId3 = uuidv4();
    const appId1  = uuidv4();
    const appId2  = uuidv4();
    const appId3  = uuidv4();

    const insertUser    = db.prepare('INSERT INTO User (UserID, Name, Email) VALUES (?, ?, ?)');
    const insertCompany = db.prepare('INSERT INTO Company (CompanyID, Name, Website, Industry, Location) VALUES (?, ?, ?, ?, ?)');
    const insertRole    = db.prepare('INSERT INTO Role (RoleID, Title, Location, PostingURL, InternshipTerm, CompanyID) VALUES (?, ?, ?, ?, ?, ?)');
    const insertApp     = db.prepare('INSERT INTO Application (ApplicationID, Date_Applied, Status, Priority, UserID, RoleID) VALUES (?, ?, ?, ?, ?, ?)');
    const insertNote    = db.prepare('INSERT INTO Note (NoteID, Content, Note_Type, ApplicationID) VALUES (?, ?, ?, ?)');
    const insertReminder= db.prepare('INSERT INTO Reminder (ReminderID, Due_Date, Reminder_Type, ApplicationID) VALUES (?, ?, ?, ?)');

  // Run seed inside a transaction for atomicity
    const seed = db.transaction(() => {
        insertUser.run(userId, 'Thomas Tran', 'thomas@university.edu');

        insertCompany.run(compId1, 'Google', 'google.com', 'Technology', 'Mountain View, CA');
        insertCompany.run(compId2, 'Meta',   'meta.com',   'Technology', 'Menlo Park, CA');
        insertCompany.run(compId3, 'Stripe', 'stripe.com', 'Fintech',    'San Francisco, CA');

        insertRole.run(roleId1, 'Software Engineer Intern', 'Mountain View, CA', 'https://careers.google.com', 'Summer 2026', compId1);
        insertRole.run(roleId2, 'Frontend Intern',          'Remote',            'https://metacareers.com',    'Summer 2026', compId2);
        insertRole.run(roleId3, 'PM Intern',                'San Francisco, CA', 'https://stripe.com/jobs',   'Summer 2026', compId3);

        insertApp.run(appId1, '2026-03-20', 'Interview', 'High',   userId, roleId1);
        insertApp.run(appId2, '2026-03-27', 'Offer',     'High',   userId, roleId2);
        insertApp.run(appId3, '2026-04-01', 'Rejected',  'Medium', userId, roleId3);

        insertNote.run(uuidv4(), 'Applied via LinkedIn recruiter outreach.', 'General',   appId1);
        insertNote.run(uuidv4(), 'Completed OA — felt confident on LC mediums.', 'General', appId1);
        insertNote.run(uuidv4(), 'Offer expires May 1st — need to decide soon.', 'Offer',  appId2);

        insertReminder.run(uuidv4(), '2026-04-25', 'Follow-up',       appId1);
        insertReminder.run(uuidv4(), '2026-05-01', 'Offer Deadline',  appId2);
    });
    seed();
    console.log('✅ Demo data seeded.');
}

module.exports = db;