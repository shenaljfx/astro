import React from 'react';
import { Redirect } from 'expo-router';

// Overrides expo-router's built-in developer sitemap (/_sitemap), which is
// bundled into production by default and lists every route in the app —
// including screens that are never linked from the UI. The route is also
// disabled via the expo-router plugin config ("sitemap": false in app.json);
// this file is the belt-and-suspenders guarantee: if anything still resolves
// /_sitemap, it lands on Home.
export default function SitemapDisabled() {
  return <Redirect href="/" />;
}
