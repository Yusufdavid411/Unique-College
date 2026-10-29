export function describeApiError(error, online = globalThis.navigator?.onLine) {
  const status = error?.response?.status;
  const response = error?.response?.data;
  const payment = /\/payments(?:\/|$)/.test(error?.config?.url || "");
  if (online === false && !status) return { title: "You're offline", message: "Your device has no internet connection. Reconnect, then try again." };
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code) || error?.name === "TimeoutError" || [408, 504].includes(status)) return { title: "Connection timed out", message: payment ? "The payment response is delayed. Do not pay again; check your payment status when the connection improves." : "The request took too long. Check your connection and try again." };
  if (!status) return { title: "Cannot reach the server", message: "We couldn't connect to the school server. Check your internet connection and try again. The service may also be temporarily unavailable." };
  if (status === 401) return /\/auth\/(?:applicant\/)?login/.test(error?.config?.url || "")
    ? { title: "Unable to sign in", message: "The login details were not accepted. Check your email or username and password, then try again." }
    : { title: "Please sign in again", message: "Your session has expired or is no longer valid. Sign in again to continue." };
  if (status === 429) return { title: "Please wait a moment", message: "Too many requests were made. Wait a little before trying again." };
  if (status === 413) return { title: "File is too large", message: "Choose a smaller file and try uploading it again." };
  if (status >= 500) return { title: "Service temporarily unavailable", message: payment ? "We couldn't confirm the payment request. Do not pay again; check its status shortly." : "The school service couldn't complete this request. Please try again shortly." };
  const missing = response?.data?.missing;
  if (Array.isArray(missing) && missing.length) return { title: "Complete the required information", message: `Please complete: ${missing.filter((item) => typeof item === "string").join(", ").slice(0, 500)}.` };
  if (response?.errors && typeof response.errors === "object") {
    const details = Object.entries(response.errors).flatMap(([field, messages]) => Array.isArray(messages) ? messages.map((message) => `${field}: ${String(message)}`) : []).join(" ").slice(0, 500);
    if (details) return { title: "Please check your entries", message: details };
  }
  if (typeof response?.message === "string" && response.message.trim()) return { title: status === 403 ? "Access not available" : "Please check this step", message: response.message.slice(0, 600) };
  return { title: "Request could not be completed", message: status === 404 ? "The requested record could not be found or is no longer available." : "Please check your information and try again." };
}

export function apiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error?.code === "ERR_CANCELED" || error?.name === "AbortError") return "";
  return error ? describeApiError(error).message : fallback;
}
