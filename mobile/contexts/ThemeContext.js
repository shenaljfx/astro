/**
 * ThemeContext — dark-only theme for Grahachara.
 *
 * Always resolves to 'dusk' (dark mode). useTheme() returns
 * the same { colors, gradients, resolved } every time.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { Palettes, ThemedGradients } from '../constants/theme';

var ThemeContext = createContext({
  colors: Palettes.dusk,
  gradients: ThemedGradients.dusk,
  mode: 'dusk',
  resolved: 'dusk',
  setMode: function () {},
  isReady: true,
});

export function ThemeProvider({ children }) {
  var value = useMemo(function () {
    return {
      colors: Palettes.dusk,
      gradients: ThemedGradients.dusk,
      mode: 'dusk',
      resolved: 'dusk',
      setMode: function () {},
      isReady: true,
    };
  }, []);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
