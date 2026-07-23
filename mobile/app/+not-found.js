import React from 'react';
import { Redirect } from 'expo-router';

// Safety net for any URL that matches no route (stale notification deep links,
// external grahachara:// links, intent replays from the Play Store "Open"
// button). Without this file expo-router ships its built-in "Unmatched Route"
// screen — which links to the developer sitemap — in production builds.
export default function NotFound() {
  return <Redirect href="/" />;
}
