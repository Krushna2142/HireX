import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAtsAnalysis,
  computeCampusEligibility,
  computeSpineScrollState,
  formatVideoTimestamp,
  getAskHirexReply,
  getModuleVideoDuration,
  validateDemoRequest,
} from './hirexLogic';
import { ACADEMIC_BRANCHES, CANDIDATE_PRESETS, JOB_PRESETS } from '../data/hirexData';

test('calculateAtsAnalysis computes matched, missing skills, and score bounds', () => {
  const candidate = CANDIDATE_PRESETS[0];
  const job = JOB_PRESETS[0];
  const result = calculateAtsAnalysis(candidate.skills, candidate.experienceYears, job);

  assert.equal(result.matchedRequired.includes('TypeScript'), true);
  assert.equal(result.missingRequired.includes('Kubernetes'), true);
  assert.ok(result.score >= 70 && result.score <= 100);
  assert.ok(result.recommendations.length > 0);
});

test('computeCampusEligibility filters by branch and adjusts counts by CGPA threshold', () => {
  const all75 = computeCampusEligibility(ACADEMIC_BRANCHES, 7.5, 'all');
  const all80 = computeCampusEligibility(ACADEMIC_BRANCHES, 8.0, 'all');
  const ceOnly = computeCampusEligibility(ACADEMIC_BRANCHES, 7.5, 'ce');

  assert.equal(all75.branches.length, ACADEMIC_BRANCHES.length);
  assert.ok(all75.eligibleStudents > all80.eligibleStudents);
  assert.equal(ceOnly.branches.length, 1);
  assert.equal(ceOnly.branches[0].id, 'ce');
});

test('getAskHirexReply routes suggested topics to local demo answers', () => {
  const ats = getAskHirexReply('How does ATS Checker work?');
  assert.equal(ats.topic, 'ATS Checker');
  assert.ok(ats.answer.includes('Demo Preview'));

  const campus = getAskHirexReply('What is Campus Hiring?');
  assert.equal(campus.topic, 'Campus Hiring');
  assert.ok(campus.answer.includes('CE, IT, ECE'));

  const fallback = getAskHirexReply('Random unrelated phrase');
  assert.equal(fallback.topic, 'Local Demo Assistant');
});

test('validateDemoRequest catches invalid fields and accepts valid input', () => {
  const bad = validateDemoRequest({
    name: 'A',
    email: 'invalid-email',
    role: 'Recruiter',
    organization: '',
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.name);
  assert.ok(bad.errors.email);
  assert.ok(bad.errors.organization);

  const good = validateDemoRequest({
    name: 'Riya Sharma',
    email: 'riya@northstar.demo',
    role: 'College / TPO',
    organization: 'Apex Institute of Technology',
  });
  assert.equal(good.valid, true);
  assert.deepEqual(good.errors, {});
});

test('module video timeline helpers return bounded durations and formatted clocks', () => {
  assert.equal(getModuleVideoDuration('campus-hiring'), 14);
  assert.equal(getModuleVideoDuration('ai-interview'), 12);
  assert.equal(getModuleVideoDuration('ats-checker'), 10);

  assert.equal(formatVideoTimestamp(0, 12), '00:00');
  assert.equal(formatVideoTimestamp(0.5, 12), '00:06');
  assert.equal(formatVideoTimestamp(1.4, 12), '00:12');
  assert.equal(formatVideoTimestamp(-0.2, 10), '00:00');
});

test('computeSpineScrollState tracks progress and lit node counts across scroll positions', () => {
  const offsets = [60, 560, 1060, 1560];
  // Before entering track
  const topState = computeSpineScrollState(offsets, 900, 900);
  assert.equal(topState.progress, 0);
  assert.equal(topState.litCount, 0);

  // Mid-way (focus at 810 in track -> halfway between 60 and 1560)
  const midState = computeSpineScrollState(offsets, -432, 900);
  assert.equal(midState.litCount, 2);
  assert.equal(midState.activeIndex, 1);
  assert.ok(midState.progress > 0.45 && midState.progress < 0.55);

  // Past last node
  const endState = computeSpineScrollState(offsets, -1500, 900);
  assert.equal(endState.progress, 1);
  assert.equal(endState.litCount, 4);
  assert.equal(endState.activeIndex, 3);
});
