import { describeApiError } from "./errorMessages.js";

let notifications = [];
let sequence = 0;
const listeners = new Set();
const recent = new Map();
const reported = new WeakSet();

export const getNotifications = () => notifications;
export function subscribeNotifications(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function publish() { for (const listener of listeners) listener(); }
export function dismissNotification(id) {
  const notification = notifications.find((entry) => entry.id === id);
  if (notification) recent.delete(notification.message);
  notifications = notifications.filter((entry) => entry.id !== id);
  publish();
}

export function notify({ title = "Something needs attention", message, type = "error" }) {
  if (typeof message !== "string" || !message.trim()) return;
  const now = Date.now();
  for (const [key, timestamp] of recent) if (now - timestamp > 10000) recent.delete(key);
  if (recent.has(message)) return;
  recent.set(message, now);
  notifications = [...notifications, { id: ++sequence, title, message, type }].slice(-3);
  publish();
}

export function reportApiError(error) {
  if (error?.code === "ERR_CANCELED" || error?.name === "AbortError") return;
  if (error && typeof error === "object") {
    if (reported.has(error)) return;
    reported.add(error);
  }
  notify(describeApiError(error));
}

export function reportUnexpectedError(error) {
  if (error?.code === "ERR_CANCELED" || error?.name === "AbortError") return;
  if (error?.response || error?.isAxiosError) return reportApiError(error);
  if (error && typeof error === "object") {
    if (reported.has(error)) return;
    reported.add(error);
  }
  notify({ title: "Something went wrong", message: "This action couldn't be completed. Please try again or reload the page if the problem continues." });
}
