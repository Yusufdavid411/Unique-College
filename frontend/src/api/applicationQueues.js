export function matchesApplicationQueue(application, queue) {
  if (queue === "all") return true;
  if (queue === "submitted") return Boolean(application.hasSubmitted ?? application.submittedAt);
  const stage = application.queue || application.notificationAudience;
  if (stage) return stage === queue;
  return queue === "waiting" && !application.reviewReady;
}
