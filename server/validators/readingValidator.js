const SLOT_LABELS = {
  morning: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};

function todayLocal() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function validateInput({ reading_date, slot, value }) {
  if (value === undefined || value === null || value === '') {
    return 'Please enter a glucose value.';
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 40 || num > 600) {
    return 'Value must be between 40 and 600 mg/dl.';
  }
  if (!SLOT_LABELS[slot]) {
    return 'Please choose a valid time slot.';
  }
  if (!reading_date || !/^\d{4}-\d{2}-\d{2}$/.test(reading_date) || isNaN(Date.parse(reading_date))) {
    return 'Please choose a valid date.';
  }
  if (reading_date > todayLocal()) {
    return 'Date cannot be in the future.';
  }
  return null;
}

function slotMessage(slot) {
  const label = SLOT_LABELS[slot];
  const article = /^[AEIOU]/.test(label) ? 'an' : 'a';
  return `You already have ${article} ${label} reading for this date.`;
}

module.exports = { SLOT_LABELS, validateInput, slotMessage };