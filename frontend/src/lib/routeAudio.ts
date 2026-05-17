let mutedRoutePath: string | null = null;

export function isRouteAudioMuted(pathname: string): boolean {
  // Mute is only for the current route visit; navigating to another route clears it.
  if (mutedRoutePath && mutedRoutePath !== pathname) {
    mutedRoutePath = null;
  }

  return mutedRoutePath === pathname;
}

export function setRouteAudioMuted(pathname: string, muted: boolean) {
  if (muted) {
    mutedRoutePath = pathname;
    return;
  }

  if (mutedRoutePath === pathname) {
    mutedRoutePath = null;
  }
}

export function isCurrentRouteAudioMuted(): boolean {
  if (typeof window === "undefined") return false;
  return isRouteAudioMuted(window.location.pathname);
}
