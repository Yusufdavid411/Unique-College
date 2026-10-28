import { Component } from "react";
import { publicPageHref } from "../api/portalLinks.js";

export function RecoveryScreen({ title = "This page could not be displayed", message = "Please reload the page. If the problem continues, return to the homepage and try again." }) {
  return <main className="app-recovery" role="alert"><div><strong>Unique College</strong><h1>{title}</h1><p>{message}</p><button type="button" onClick={() => window.location.reload()}>Reload page</button><a href={publicPageHref("/", window.location.hostname)}>Return to homepage</a></div></main>;
}

export default class AppErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <RecoveryScreen /> : this.props.children; }
}
