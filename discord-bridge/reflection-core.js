/**
 * OpenClaw Reflection Core — Worker→Grader→Observer
 * Import this in any agent to add self-improvement
 */
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LESSONS_FILE = '/home/friends7777wolfs/OpenClawMaster/discord-bridge/reflection-lessons.json';

function loadLessons(agentName) {
  try {
    const all = JSON.parse(fs.readFileSync(LESSONS_FILE, 'utf8'));
    return all[agentName] || [];
  } catch { return []; }
}

function saveLessons(agentName, lessons) {
  let all = {};
  try { all = JSON.parse(fs.readFileSync(LESSONS_FILE, 'utf8')); } catch {}
  all[agentName] = lessons.slice(-20); // keep last 20
  fs.writeFileSync(LESSONS_FILE, JSON.stringify(all, null, 2));
}

/**
 * runReflection(agentName, task, workerFn, graderFn, observerFn, maxRounds)
 * 
 * workerFn(task, feedback, lessons) → output
 * graderFn(task, output) → { passed, score, feedback }
 * observerFn(task, rounds) → { accept, lesson, finalOutput }
 */
async function runReflection(agentName, task, workerFn, graderFn, observerFn, maxRounds = 3) {
  const lessons = loadLessons(agentName);
  const rounds = [];
  let feedback = null;

  for (let r = 1; r <= maxRounds; r++) {
    const output = await workerFn(task, feedback, lessons);
    const grade = await graderFn(task, output);
    rounds.push({ r, output, grade });

    if (grade.passed && grade.score >= 0.80) break;
    feedback = grade.feedback;
  }

  const verdict = await observerFn(task, rounds);

  if (verdict.lesson) {
    lessons.push({ time: new Date().toISOString(), lesson: verdict.lesson });
    saveLessons(agentName, lessons);
  }

  return { verdict, rounds, lessons };
}

module.exports = { runReflection, loadLessons };
