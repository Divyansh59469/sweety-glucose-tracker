const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function getSelectedDate(req) {
  return parseDate(req.query.date || formatDate(new Date()));
}

async function summarize(userId, from, to) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count,
            MAX(value) AS highest,
            MIN(value) AS lowest,
            ROUND(AVG(value), 1)::float AS average
     FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  return result.rows[0];
}

const BAD_DATE = { error: 'Please provide a valid date in YYYY-MM-DD format.' };

router.get('/daily', async (req, res) => {
  const selected = getSelectedDate(req);
  if (!selected) return res.status(400).json(BAD_DATE);
  const day = formatDate(selected);
  try {
    const summary = await summarize(req.user.id, day, day);
    const list = await pool.query(
      `SELECT id, reading_date::text AS reading_date, slot, value
       FROM readings
       WHERE user_id = $1 AND reading_date = $2
       ORDER BY array_position(ARRAY['morning','after_breakfast','after_lunch','after_dinner'], slot::text)`,
      [req.user.id, day]
    );
    res.json({ report: 'daily', from: day, to: day, ...summary, readings: list.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.get('/month-to-date', async (req, res) => {
  const selected = getSelectedDate(req);
  if (!selected) return res.status(400).json(BAD_DATE);
  const from = formatDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const to = formatDate(selected);
  try {
    const summary = await summarize(req.user.id, from, to);
    res.json({ report: 'month-to-date', from, to, ...summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.get('/monthly', async (req, res) => {
  const selected = getSelectedDate(req);
  if (!selected) return res.status(400).json(BAD_DATE);
  const from = formatDate(new Date(selected.getFullYear(), selected.getMonth() - 1, 1));
  const to = formatDate(new Date(selected.getFullYear(), selected.getMonth(), 0));
  try {
    const summary = await summarize(req.user.id, from, to);
    res.json({ report: 'monthly', from, to, ...summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;