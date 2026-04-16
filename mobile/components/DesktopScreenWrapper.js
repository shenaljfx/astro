/**
 * DesktopScreenWrapper
 *
 * The single layout contract for every tab screen.
 *
 * On DESKTOP (>= 1024 px):
 *   - Renders the DesktopTopBar (64 px) above the screen content.
 *   - Removes the mobile status-bar / header top-padding that each screen
 *     normally adds (they used paddingTop: 88-110 for the translucent header).
 *   - Removes the bottom floating-tab-bar spacer (the <View style={{height:120}} />
 *     that each screen adds at the end).  We achieve this by passing
 *     isDesktop=true via context so screens can conditionally render the spacer.
 *   - Content is padded exactly TOPBAR_H from the top, zero from the bottom.
 *   - maxWidth + auto horizontal margins centre the content on very wide screens.
 *
 * On MOBILE/TABLET:
 *   - Completely transparent — children rendered as-is, zero overhead.
 *
 * Usage (every tab screen):
 *   import DesktopScreenWrapper from '../../components/DesktopScreenWrapper';
 *
 *   return (
 *     <DesktopScreenWrapper routeName="index">
 *       <CosmicBackground>...</CosmicBackground>
 *     </DesktopScreenWrapper>
 *   );
 */

import React, { createContext, useContext } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { DesktopTopBar, TOPBAR_H } from './DesktopLayout';
import useIsDesktop from '../hooks/useIsDesktop';
import { useLanguage } from '../contexts/LanguageContext';

// Context so child components can read isDesktop without prop drilling
var DesktopCtx = createContext(false);
export function useDesktopCtx() { return useContext(DesktopCtx); }

export default function DesktopScreenWrapper({ routeName, balance, children }) {
  var isDesktop = useIsDesktop();
  var { language } = useLanguage();

  if (!isDesktop) {
    return (
      <DesktopCtx.Provider value={false}>
        {children}
      </DesktopCtx.Provider>
    );
  }

  return (
    <DesktopCtx.Provider value={true}>
      <View style={dw.root}>
        {/* Fixed top bar */}
        <DesktopTopBar routeName={routeName} language={language} balance={balance || null} />
        {/* Screen content — flex:1, no extra padding */}
        <View style={dw.body}>
          {children}
        </View>
      </View>
    </DesktopCtx.Provider>
  );
}

var dw = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#04030C',
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    overflow: 'hidden',
  },
});
