require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./db');

const SLOTS = ['morning', 'after_breakfast', 'after_lunch', 'after_dinner'];
const BASE = { morning: 95, after_breakfast: 140, after_lunch: 135, after_dinner: 130 };

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function seed() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const userResult = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    ['Demo User', 'demo@example.com', passwordHash]
  );
  const userId = userResult.rows[0].id;

  await pool.query('DELETE FROM readings WHERE user_id = $1', [userId]);

  const today = new Date();
  let count = 0;
  for (let i = 0; i < 60; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const date = formatDate(day);
    const slotsToday = SLOTS.slice(0, 2 + (i % 3));
    for (let s = 0; s < slotsToday.length; s++) {
      const slot = slotsToday[s];
      const value = BASE[slot] + ((i * 7 + s * 13) % 41) - 20;
      await pool.query(
        'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)',
        [userId, date, slot, value]
      );
      count++;
    }
  }
  console.log(`Seeded demo user (demo@example.com / demo1234) with ${count} readings.`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());