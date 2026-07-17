/**
 * CitySearchPicker — Reusable global location search component
 * Uses OpenStreetMap Nominatim (free, no API key) with debounced search.
 * Shows popular cities when idle, geocoding results when typing.
 *
 * Props:
 *   selectedCity  — { name, country?, countryCode?, lat, lng } | null
 *   onSelect      — (city) => void
 *   lang          — 'en' | 'si'
 *   accentColor   — optional tint (default '#B47AFF')
 *   maxHeight     — list max height (default 200)
 *   placeholder   — custom placeholder text
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { searchCities } from '../services/api';

/* ── Popular cities (shown when no search query) ── */
var POPULAR_CITIES = [
  { name: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', lat: 6.9271, lng: 79.8612, flag: '🇱🇰' },
  { name: 'Kandy', country: 'Sri Lanka', countryCode: 'LK', lat: 7.2906, lng: 80.6337, flag: '🇱🇰' },
  { name: 'Galle', country: 'Sri Lanka', countryCode: 'LK', lat: 6.0535, lng: 80.2210, flag: '🇱🇰' },
  { name: 'Jaffna', country: 'Sri Lanka', countryCode: 'LK', lat: 9.6615, lng: 80.0255, flag: '🇱🇰' },
  { name: 'Matara', country: 'Sri Lanka', countryCode: 'LK', lat: 5.9549, lng: 80.5550, flag: '🇱🇰' },
  { name: 'New Delhi', country: 'India', countryCode: 'IN', lat: 28.6139, lng: 77.2090, flag: '🇮🇳' },
  { name: 'London', country: 'United Kingdom', countryCode: 'GB', lat: 51.5074, lng: -0.1278, flag: '🇬🇧' },
  { name: 'New York', country: 'United States', countryCode: 'US', lat: 40.7128, lng: -74.0060, flag: '🇺🇸' },
  { name: 'Dubai', country: 'UAE', countryCode: 'AE', lat: 25.2048, lng: 55.2708, flag: '🇦🇪' },
  { name: 'Sydney', country: 'Australia', countryCode: 'AU', lat: -33.8688, lng: 151.2093, flag: '🇦🇺' },
  { name: 'Toronto', country: 'Canada', countryCode: 'CA', lat: 43.6532, lng: -79.3832, flag: '🇨🇦' },
  { name: 'Singapore', country: 'Singapore', countryCode: 'SG', lat: 1.3521, lng: 103.8198, flag: '🇸🇬' },
];

var COUNTRY_FLAGS = {
  'LK': '🇱🇰', 'IN': '🇮🇳', 'GB': '🇬🇧', 'US': '🇺🇸', 'AE': '🇦🇪',
  'AU': '🇦🇺', 'CA': '🇨🇦', 'SG': '🇸🇬', 'QA': '🇶🇦', 'KR': '🇰🇷',
  'JP': '🇯🇵', 'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'NZ': '🇳🇿',
  'MY': '🇲🇾', 'TH': '🇹🇭', 'PK': '🇵🇰', 'BD': '🇧🇩', 'CN': '🇨🇳',
};

var getFlag = function (city) {
  if (city.flag) return city.flag;
  return COUNTRY_FLAGS[city.countryCode] || '🌐';
};

export default function CitySearchPicker({ selectedCity, onSelect, lang, accentColor, maxHeight, placeholder, compact }) {
  var accent = accentColor || '#FF8C00';
  var listMax = maxHeight || 200;
  var [query, setQuery] = useState('');
  var [results, setResults] = useState([]);
  var [searching, setSearching] = useState(false);
  var [expanded, setExpanded] = useState(false);
  var timer = useRef(null);

  /* ── City search via server proxy ── */
  var search = useCallback(function (text) {
    if (timer.current) clearTimeout(timer.current);
    if (!text || text.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async function () {
      try {
        var res = await searchCities(text.trim());
        var mapped = (res && res.data && Array.isArray(res.data)) ? res.data : [];
        setResults(mapped);
      } catch (err) {
        if (__DEV__) console.warn('City search error:', err && err.message);
        setResults([]);
      }
      setSearching(false);
    }, 400);
  }, []);

  var handleChange = function (text) {
    setQuery(text);
    search(text);
    if (compact && text.trim().length >= 2) setExpanded(true);
  };

  var handleSelect = function (city) {
    onSelect(city);
    setQuery(city.name);
    setResults([]);
    if (compact) setExpanded(false);
  };

  var handleClear = function () {
    setQuery('');
    setResults([]);
    if (compact) setExpanded(false);
  };

  // Idle (no query yet) → offer the popular-cities shortlist so the user can
  // pick without typing; once they've typed 2+ chars, show live results.
  var idle = query.trim().length < 2;
  var displayList = idle ? (compact ? [] : POPULAR_CITIES) : results;
  var showPopularLabel = !compact && idle;

  // ── COMPACT MODE: collapsed = just a pill showing selected city ──
  if (compact && !expanded) {
    return (
      <TouchableOpacity
        style={[st.compactPill, { borderColor: selectedCity ? accent + '40' : 'rgba(255,255,255,0.10)' }]}
        onPress={function () { setExpanded(true); }}
        activeOpacity={0.7}
      >
        {selectedCity ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>{getFlag(selectedCity)}</Text>
            <Text style={[st.compactName, { color: accent }]} numberOfLines={1}>{selectedCity.name}</Text>
            {selectedCity.country ? <Text style={st.compactSub} numberOfLines={1}> • {selectedCity.country}</Text> : null}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="location-outline" size={15} color="rgba(255,255,255,0.35)" style={{ marginRight: 6 }} />
            <Text style={{ color: 'rgba(255,214,102,0.40)', fontSize: 13 }}>
              {lang === 'si' ? 'නගරය තෝරන්න...' : 'Select city...'}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-down" size={15} color="rgba(255,255,255,0.30)" />
      </TouchableOpacity>
    );
  }

  // ── Compact mode expanded: search input + results, no popular list ──
  var showList = compact ? (query.trim().length >= 2) : true;
  var showPopular = compact ? false : showPopularLabel;

  return (
    <View>
      {/* ── Search Input ── */}
      <View style={[st.searchRow, { borderColor: selectedCity ? accent + '50' : 'rgba(255,255,255,0.10)' }]}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
        <TextInput
          style={st.searchInput}
          placeholder={placeholder || (lang === 'si' ? 'නගරය සොයන්න...' : 'Search any city...')}
          placeholderTextColor="rgba(255,214,102,0.40)"
          value={query}
          onChangeText={handleChange}
          autoCorrect={false}
          returnKeyType="search"
          autoFocus={compact && expanded}
          maxLength={100}
        />
        {searching ? (
          <ActivityIndicator size="small" color={accent} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.30)" />
          </TouchableOpacity>
        ) : compact ? (
          <TouchableOpacity onPress={function () { setExpanded(false); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.30)" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Selected City Badge ── */}
      {selectedCity ? (
        <Animated.View entering={FadeInDown.duration(250)} style={[st.badge, { borderColor: accent + '40' }]}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>{getFlag(selectedCity)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[st.badgeName, { color: accent }]}>{selectedCity.name}</Text>
            <Text style={st.badgeSub}>
              {selectedCity.country ? selectedCity.country + ' • ' : ''}
              {selectedCity.lat.toFixed(2)}°, {selectedCity.lng.toFixed(2)}°
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={18} color={accent} />
        </Animated.View>
      ) : null}

      {/* ── Popular label ── */}
      {showPopular ? (
        <Text style={st.popularLabel}>
          {lang === 'si' ? '🌍 ජනප්‍රිය නගර' : '🌍 Popular Cities'}
        </Text>
      ) : null}

      {/* ── Results / Popular list ── */}
      {showList && (
      <ScrollView
        style={[st.list, { maxHeight: listMax }]}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searching && displayList.length === 0 ? (
          <View style={st.emptyWrap}>
            <ActivityIndicator size="small" color={accent} />
            <Text style={st.emptyText}>{lang === 'si' ? 'සොයමින්...' : 'Searching...'}</Text>
          </View>
        ) : !searching && query.trim().length >= 2 && displayList.length === 0 ? (
          <View style={st.emptyWrap}>
            <Ionicons name="location-outline" size={28} color="rgba(255,255,255,0.15)" />
            <Text style={st.emptyText}>{lang === 'si' ? 'ප්‍රතිඵල හමු නොවීය' : 'No results found'}</Text>
          </View>
        ) : (
          displayList.map(function (city, i) {
            var isSel = selectedCity && selectedCity.name === city.name && selectedCity.lat === city.lat;
            return (
              <TouchableOpacity
                key={city.name + '-' + city.lat + '-' + i}
                style={[st.cityRow, isSel && { backgroundColor: accent + '18', borderColor: accent + '40' }]}
                onPress={function () { handleSelect(city); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 16, marginRight: 10 }}>{getFlag(city)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.cityName, isSel && { color: accent }]}>{city.name}</Text>
                  <Text style={st.citySub}>{city.country || ''}</Text>
                </View>
                {isSel ? <Ionicons name="checkmark-circle" size={18} color={accent} /> : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      )}
    </View>
  );
}

var st = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFE8B0',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(180,122,255,0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  badgeName: { fontSize: 14, fontWeight: '700' },
  badgeSub: { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 },
  popularLabel: {
    color: 'rgba(255,214,102,0.50)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  list: {},
  emptyWrap: { paddingVertical: 20, alignItems: 'center', gap: 8 },
  emptyText: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cityName: { color: '#FFF1D0', fontSize: 14, fontWeight: '600' },
  citySub: { color: 'rgba(255,255,255,0.30)', fontSize: 10, marginTop: 2 },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(180,122,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  compactName: { color: '#FFF1D0', fontSize: 14, fontWeight: '700' },
  compactSub: { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 1 },
});
