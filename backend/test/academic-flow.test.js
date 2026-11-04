import test from "node:test";
import assert from "node:assert/strict";
import { assertRegistrationSelection, checkVersion, questionsSchema, publicExamQuestions, scoreAttempt, validateAnswers, hasAcademicResponsibility, attemptAcceptsAnswers } from "../src/services/academicFlow.js";

test("registration enforces core courses, units, duplicates and course ownership", () => {
  const courses = [{ id: "core", category: "CORE", creditUnits: 3 }, { id: "option", category: "ELECTIVE", creditUnits: 2 }];
  assert.equal(assertRegistrationSelection(courses, ["core"], { minUnits: 3, maxUnits: 5 }).length, 1);
  for (const ids of [[], ["option"], ["core", "foreign"], ["core", "core"]]) assert.throws(() => assertRegistrationSelection(courses, ids, { minUnits: 3, maxUnits: 5 }));
  assert.throws(() => assertRegistrationSelection(courses, ["core", "option"], { minUnits: 1, maxUnits: 4 }), /credit units/);
});
test("record versions reject stale saves", () => {
  const updatedAt = new Date("2026-11-04T12:00:00Z");
  checkVersion(null, null);
  checkVersion({ updatedAt }, updatedAt.toISOString());
  assert.throws(() => checkVersion({ updatedAt }, null), /changed/);
});
test("CBT public payload omits answer keys and scoring ignores browser totals", () => {
  const questions = questionsSchema.parse([{ prompt: "First question", options: ["A", "B"], correctIndex: 1 }, { prompt: "Second question", options: ["A", "B"], correctIndex: 0 }]);
  assert.equal(scoreAttempt(questions, { 0: 1, 1: 0 }), 100);
  assert.equal(scoreAttempt(questions, { 0: 0, 1: 0 }), 50);
  assert.equal(scoreAttempt(questions, {}), 0);
  assert.ok(publicExamQuestions(questions).every((question) => !("correctIndex" in question)));
  for (const answers of [{ 0: 9 }, { "-1": 0 }, { 4: 0 }, { "01": 0 }, { 0: 0.5 }]) assert.throws(() => validateAnswers(questions, answers));
  assert.equal(questionsSchema.safeParse([{ prompt: "Question", options: ["A", "B"], correctIndex: 2 }]).success, false);
});
test("result officers are department-scoped and general officer is global", async () => {
  let query;
  const database = { academicAppointment: { findFirst: async (value) => { query = value.where; return null; } } };
  assert.equal(await hasAcademicResponsibility(database, { id: "lecturer", role: "STAFF" }, "department", "DEPARTMENT_EXAM_OFFICER"), false);
  assert.equal(query.departmentId, "department");
  assert.equal(query.staffId, "lecturer");
  await hasAcademicResponsibility(database, { id: "general", role: "STAFF" }, "department", "GENERAL_EXAM_OFFICER");
  assert.equal(query.departmentId, null);
  assert.equal(await hasAcademicResponsibility(database, { role: "STUDENT" }, "department", "HOD"), false);
});
test("CBT refuses answers at the deadline and after submission", () => {
  const deadline = new Date("2026-11-04T12:00:00Z");
  assert.equal(attemptAcceptsAnswers({ deadline }, new Date("2026-11-04T11:59:59Z")), true);
  assert.equal(attemptAcceptsAnswers({ deadline }, deadline), false);
  assert.equal(attemptAcceptsAnswers({ deadline, submittedAt: new Date("2026-11-04T11:50:00Z") }, new Date("2026-11-04T11:59:59Z")), false);
});
