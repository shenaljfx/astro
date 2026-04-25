/**
 * useDebouncedValue — returns a value after it has been stable for `delayMs`.
 *
 * Useful for search inputs (city picker), filter fields, and any UI where
 * heavy work shouldn't fire on every keystroke.
 *
 * Usage:
 *   var [query, setQuery] = useState('');
 *   var debounced = useDebouncedValue(query, 350);
 *   useEffect(function () { runSearch(debounced); }, [debounced]);
 */

import { useState, useEffect } from 'react';

export default function useDebouncedValue(value, delayMs) {
  var [debounced, setDebounced] = useState(value);

  useEffect(function () {
    var id = setTimeout(function () { setDebounced(value); }, delayMs || 300);
    return function () { clearTimeout(id); };
  }, [value, delayMs]);

  return debounced;
}
