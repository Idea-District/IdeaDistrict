"use client";

import { Component, type ReactNode } from "react";

/** If the 3D Cafe ever fails on a device, show the list view instead of a broken page. */
export class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("The 3D Cafe couldn't run here; showing the list view.", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
