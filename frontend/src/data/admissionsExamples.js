export function watDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function dateAfter(days, now) {
  const date = new Date(watDate(now));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function exampleSubmissionDeadline(now) {
  return dateAfter(30, now);
}

export function fillLetterExamples(policy, now = new Date()) {
  const year = Number(watDate(now).slice(0, 4));
  const examples = {
    session: `${year}/${year + 1} (temporary)`,
    duration: "2 years (temporary; confirm per programme)",
    effectiveDate: dateAfter(37, now),
    registrationOpen: dateAfter(37, now),
    registrationDeadline: dateAfter(60, now),
    resultDeadline: dateAfter(60, now),
    lecturesStart: dateAfter(67, now)
  };
  return { ...policy, ...Object.fromEntries(Object.entries(examples).filter(([key]) => !policy[key])) };
}
