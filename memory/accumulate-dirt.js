/**
 * Dirt Accumulator — רץ ברקע, צובר שגיאות + לקחים + אירועים
 * נכתב ל: memory/dirt.json
 */
const fs = require('fs');
const path = require('path');
const DIRT_FILE = path.join(__dirname, 'dirt.json');

function loadDirt() {
  try { return JSON.parse(fs.readFileSync(DIRT_FILE, 'utf8')); }
  catch { return { session_start: new Date().toISOString(), errors: [], lessons: [], events: [] }; }
}

function saveDirt(dirt) {
  fs.writeFileSync(DIRT_FILE, JSON.stringify(dirt, null, 2));
}

// API ציבורי — מודולים אחרים קוראים לזה
function addError(source, message, context = {}) {
  const dirt = loadDirt();
  dirt.errors.push({ ts: new Date().toISOString(), source, message, context });
  if (dirt.errors.length > 100) dirt.errors = dirt.errors.slice(-100); // שמור רק 100 אחרונים
  saveDirt(dirt);
}

function addLesson(type, lesson) {
  const dirt = loadDirt();
  dirt.lessons.push({ ts: new Date().toISOString(), type, lesson });
  saveDirt(dirt);
}

function addEvent(name, details = {}) {
  const dirt = loadDirt();
  dirt.events.push({ ts: new Date().toISOString(), name, details });
  if (dirt.events.length > 200) dirt.events = dirt.events.slice(-200);
  saveDirt(dirt);
}

function getDirtSummary() {
  const dirt = loadDirt();
  const errorGroups = {};
  dirt.errors.forEach(e => {
    errorGroups[e.source] = (errorGroups[e.source] || 0) + 1;
  });
  return {
    session_start: dirt.session_start,
    total_errors: dirt.errors.length,
    error_breakdown: errorGroups,
    lessons_count: dirt.lessons.length,
    lessons: dirt.lessons,
    recent_events: dirt.events.slice(-10)
  };
}

module.exports = { addError, addLesson, addEvent, getDirtSummary };
