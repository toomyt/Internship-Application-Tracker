const VALID_STATUSES = [
    'Wishlist','Applied','Online Assessment',
    'Phone Screen','Interview','Offer','Rejected','Withdrawn'
];

const VALID_PRIORITIES = ['Low', 'Medium', 'High'];

const VALID_NOTE_TYPES = ['General', 'Interview', 'Follow-up', 'Offer', 'Other'];

const VALID_REMINDER_TYPES = [
    'Application Deadline', 'Follow-up', 'Interview', 'Offer Deadline', 'Other'
];

function fail(res, message) {
    return res.status(400).json({ error: message });
}

function isValidDate(str) {
    return str && /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

function validateApplication(req, res, next) {
    const { Status, Priority, Date_Applied, RoleID } = req.body;

    if (!RoleID || typeof RoleID !== 'string') {
        return fail(res, 'RoleID is required.');
    }
    if (Status && !VALID_STATUSES.includes(Status)) {
        return fail(res, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    if (Priority && !VALID_PRIORITIES.includes(Priority)) {
        return fail(res, `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }
    if (Date_Applied && !isValidDate(Date_Applied)) {
        return fail(res, 'Date_Applied must be a valid date in YYYY-MM-DD format.');
    }

    next();
}

function validateCompany(req, res, next) {
    const { Name } = req.body;
    if (!Name || typeof Name !== 'string' || Name.trim().length === 0) {
        return fail(res, 'Company Name is required.');
    }
    next();
}

function validateRole(req, res, next) {
    const { Title, CompanyID } = req.body;
    if (!Title || typeof Title !== 'string' || Title.trim().length === 0) {
        return fail(res, 'Role Title is required.');
    }
    if (!CompanyID || typeof CompanyID !== 'string') {
        return fail(res, 'CompanyID is required.');
    }
    next();
}

function validateNote(req, res, next) {
    const { Content, Note_Type, ApplicationID } = req.body;
    if (!Content || typeof Content !== 'string' || Content.trim().length === 0) {
        return fail(res, 'Note Content is required.');
    }
    if (!ApplicationID || typeof ApplicationID !== 'string') {
        return fail(res, 'ApplicationID is required.');
    }
    if (Note_Type && !VALID_NOTE_TYPES.includes(Note_Type)) {
        return fail(res, `Invalid Note_Type. Must be one of: ${VALID_NOTE_TYPES.join(', ')}`);
    }
    next();
}

function validateReminder(req, res, next) {
    const { Due_Date, Reminder_Type, ApplicationID } = req.body;
    if (!Due_Date || !isValidDate(Due_Date)) {
        return fail(res, 'Due_Date is required and must be in YYYY-MM-DD format.');
    }
    if (!Reminder_Type || !VALID_REMINDER_TYPES.includes(Reminder_Type)) {
        return fail(res, `Invalid Reminder_Type. Must be one of: ${VALID_REMINDER_TYPES.join(', ')}`);
    }
    if (!ApplicationID || typeof ApplicationID !== 'string') {
        return fail(res, 'ApplicationID is required.');
    }
    next();
}

function validateContact(req, res, next) {
    const { Full_Name, CompanyID } = req.body;
    if (!Full_Name || typeof Full_Name !== 'string' || Full_Name.trim().length === 0) {
        return fail(res, 'Contact Full_Name is required.');
    }
    if (!CompanyID || typeof CompanyID !== 'string') {
        return fail(res, 'CompanyID is required.');
    }
    next();
}

module.exports = {
  validateApplication,
  validateCompany,
  validateRole,
  validateNote,
  validateReminder,
  validateContact,
};