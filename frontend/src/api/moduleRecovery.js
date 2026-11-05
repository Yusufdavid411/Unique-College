const reloadKey = "unique_college_module_reload";
const retryWindow = 60000;

export function isModuleLoadError(error) {
  return error?.name === "ChunkLoadError" || /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading (?:CSS )?chunk .+ failed|Unable to preload CSS/i.test(error?.message || "");
}

export function recoverModuleLoad(error, runtime = globalThis, now = Date.now()) {
  if (!isModuleLoadError(error) || runtime.navigator?.onLine === false) return false;
  try {
    const storage = runtime.sessionStorage;
    if (!storage) return false;
    const lastReload = Number(storage.getItem(reloadKey));
    if (lastReload > 0 && now - lastReload < retryWindow) return false;
    storage.setItem(reloadKey, String(now));
    runtime.location.reload();
    return true;
  } catch { return false; }
}

export function installModuleRecovery(runtime = globalThis) {
  const listener = (event) => {
    if (recoverModuleLoad(event.payload, runtime)) event.preventDefault();
  };
  runtime.addEventListener("vite:preloadError", listener);
  return () => runtime.removeEventListener("vite:preloadError", listener);
}
