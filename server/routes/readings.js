const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/auth');
const { validateInput, slotMessage } = require('../validators/readingValidator');

const router = express.Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  const { reading_date, slot, value } = req.body;
  const inputError = validateInput({ reading_date, slot, value });
  if (inputError) {
    return res.status(400).json({ error: inputError });
  }
  try {
    const existing = await pool.query(
      'SELECT slot FROM readings WHERE user_id = $1 AND reading_date = $2',
      [req.user.id, reading_date]
    );
    if (existing.rows.length >= 4) {
      return res.status(400).json({ error: 'You can add only 4 readings per day.' });
    }
    if (existing.rows.some((r) => r.slot === slot)) {
      return res.status(409).json({ error: slotMessage(slot) });
    }
    const result = await pool.query(
      `INSERT INTO readings (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING id, reading_date::text AS reading_date, slot, value`,
      [req.user.id, reading_date, slot, Number(value)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: slotMessage(slot) });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, reading_date::text AS reading_date, slot, value
       FROM readings WHERE user_id = $1
       ORDER BY reading_date DESC, id DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Reading not found.' });
  }
  const { reading_date, slot, value } = req.body;
  const inputError = validateInput({ reading_date, slot, value });
  if (inputError) {
    return res.status(400).json({ error: inputError });
  }
  try {
    const owned = await pool.query(
      'SELECT id FROM readings WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (owned.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found.' });
    }
    const others = await pool.query(
      'SELECT slot FROM readings WHERE user_id = $1 AND reading_date = $2 AND id <> $3',
      [req.user.id, reading_date, id]
    );
    if (others.rows.length >= 4) {
      return res.status(400).json({ error: 'You can add only 4 readings per day.' });
    }
    if (others.rows.some((r) => r.slot === slot)) {
      return res.status(409).json({ error: slotMessage(slot) });
    }
    const result = await pool.query(
      `UPDATE readings SET reading_date = $1, slot = $2, value = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, reading_date::text AS reading_date, slot, value`,
      [reading_date, slot, Number(value), id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: slotMessage(slot) });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Reading not found.' });
  }
  try {
    const result = await pool.query(
      'DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reading not found.' });
    }
    res.json({ message: 'Reading deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;