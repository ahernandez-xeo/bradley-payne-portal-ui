import { Component } from "react";

import classes from "./ErrorBoundary.module.scss";

/**
 * Top-level guard. Without this a render error anywhere in the tree unmounts
 * the whole app and leaves a blank white page with no way back.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className={classes.wrap} role="alert">
        <div className={classes.card}>
          <h1 className={classes.title}>Something went wrong</h1>
          <p className={classes.copy}>
            The portal hit an unexpected error and could not finish loading this view.
            Reloading usually clears it. If it keeps happening, contact
            support@bradleypayne.com.
          </p>
          <div className={classes.actions}>
            <button type="button" className={classes.primaryBtn} onClick={this.handleReload}>
              Reload portal
            </button>
            <button type="button" className={classes.secondaryBtn} onClick={this.handleReset}>
              Try again
            </button>
          </div>
          {error?.message && (
            <details className={classes.details}>
              <summary>Technical details</summary>
              <code>{error.message}</code>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
