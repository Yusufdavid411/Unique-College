import { Component } from "react";
import { portalScope, publicPageHref } from "../api/portalLinks.js";
import { reportUnexpectedError } from "../api/notifications.js";
import { isModuleLoadError, recoverModuleLoad } from "../api/moduleRecovery.js";

export function RecoveryScreen({ title = "This page could not be displayed", message = "Please reload the page. If the problem continues, return to the homepage and try again." }) {
  const portal = portalScope(window.location.hostname);
  return <main className="app-recovery" role="alert"><div><strong>Unique College</strong><h1>{title}</h1><p>{message}</p><button className="button primary" type="button" onClick={() => window.location.reload()}>Try again</button><a className="button secondary" href={portal ? "/" : publicPageHref("/", window.location.hostname)}>{portal ? "Return to dashboard" : "Return to homepage"}</a></div></main>;
}

export default class AppErrorBoundary extends Component {
  state = { failed: false, moduleFailure: false, refreshing: false };
  static getDerivedStateFromError(error) { return { failed: true, moduleFailure: isModuleLoadError(error) }; }
  componentDidCatch(error) {
    if (isModuleLoadError(error)) {
      if (recoverModuleLoad(error, window)) this.setState({ refreshing: true });
      return;
    }
    reportUnexpectedError(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    if (this.state.refreshing) return <RecoveryScreen title="Updating this page" message="Loading the latest version. Your account and saved records are unchanged." />;
    if (this.state.moduleFailure) return <RecoveryScreen title="This page could not finish loading" message={navigator.onLine === false ? "You’re offline. Reconnect to the internet, then try again." : "A page file could not be downloaded. Check your connection and try again."} />;
    return <RecoveryScreen />;
  }
}
