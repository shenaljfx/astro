/**
 * CosmicDateTimePicker — beautiful cosmic-themed date & time picker modals.
 *
 * Exports two components:
 *   <DatePickerField />  — tappable field + modal for YYYY-MM-DD
 *   <TimePickerField />  — tappable field + modal for HH:MM
 *
 * v2 — Redesigned for usability:
 *   • Highlighted selection band with glow
 *   • AM/PM toggle button (no more scrolling 0–23)
 *   • Day-of-week in date preview
 *   • Larger touch targets (52 px rows)
 *   • Decade quick-jump chips for year
 *   • 5-minute step quick-select for minutes
 *   • Smooth momentum snap scrolling
 *
 * Works on Web, iOS, and Android with no native dependencies.
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

const { width: W } = Dimensions.get('window');
const ITEM_H = 52;
const VISIBLE = 5;
const LIST_H = ITEM_H * VISIBLE;

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_SI = ['ජන', 'පෙබ', 'මාර්', 'අප්\u200D', 'මැයි', 'ජුනි', 'ජුලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'];
const MONTHS_FULL_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SI = ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'];

function range(start, end) {
  var arr = [];
  for (var i = start; i <= end; i++) arr.push(i);
  return arr;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year, month, day, lang) {
  var d = new Date(year, month - 1, day);
  var dayIdx = d.getDay();
  return lang === 'si' ? DAYS_SI[dayIdx] : DAYS_EN[dayIdx];
}

// ─── Scroll Wheel Column ────────────────────────────────────────

function WheelColumn({ data, selected, onSelect, formatItem, width }) {
  var listRef = useRef(null);
  var idx = data.indexOf(selected);
  if (idx < 0) idx = 0;
  var scrolledRef = useRef(false);

  useEffect(function () {
    if (listRef.current && !scrolledRef.current) {
      scrolledRef.current = true;
      try {
        listRef.current.scrollToOffset({ offset: Math.max(0, idx - 2) * ITEM_H, animated: false });
      } catch (_) {}
    }
  }, []);

  // Re-scroll when selected value changes from outside (e.g. decade chips)
  useEffect(function () {
    if (listRef.current && scrolledRef.current) {
      var newIdx = data.indexOf(selected);
      if (newIdx >= 0) {
        try {
          listRef.current.scrollToOffset({ offset: Math.max(0, newIdx - 2) * ITEM_H, animated: true });
        } catch (_) {}
      }
    }
  }, [selected]);

  var renderItem = useCallback(function ({ item }) {
    var isActive = item === selected;
    return (
      <TouchableOpacity
        style={[ws.item, isActive && ws.itemActive]}
        onPress={function () { onSelect(item); }}
        activeOpacity={0.7}
      >
        <Text style={[ws.itemText, isActive && ws.itemTextActive]}>
          {formatItem ? formatItem(item) : item}
        </Text>
      </TouchableOpacity>
    );
  }, [selected, onSelect, formatItem]);

  var keyExtractor = useCallback(function (item) { return '' + item; }, []);

  return (
    <View style={[ws.col, width && { width }]}>
      {/* Selection highlight band */}
      <View style={ws.selectionBand} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,140,0,0.12)', 'rgba(147,51,234,0.10)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        />
      </View>
      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        style={{ height: LIST_H }}
        getItemLayout={function (_, i) { return { length: ITEM_H, offset: ITEM_H * i, index: i }; }}
        initialScrollIndex={Math.max(0, idx - 2)}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={function (e) {
          var offsetY = e.nativeEvent.contentOffset.y;
          var snappedIdx = Math.round(offsetY / ITEM_H) + 2;
          if (snappedIdx >= 0 && snappedIdx < data.length) {
            onSelect(data[snappedIdx]);
          }
        }}
      />
      {/* Top/bottom fade overlays */}
      <View style={ws.fadeTop} pointerEvents="none">
        <LinearGradient colors={['rgba(20,10,45,0.95)', 'transparent']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={ws.fadeBottom} pointerEvents="none">
        <LinearGradient colors={['transparent', 'rgba(20,10,45,0.95)']} style={StyleSheet.absoluteFill} />
      </View>
    </View>
  );
}

var ws = StyleSheet.create({
  col: { flex: 1, position: 'relative' },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  itemActive: { borderRadius: 12 },
  itemText: { color: 'rgba(255,255,255,0.35)', fontSize: 16, fontWeight: '600' },
  itemTextActive: { color: '#FFE8B0', fontSize: 20, fontWeight: '800' },
  selectionBand: {
    position: 'absolute', top: ITEM_H * 2, left: 4, right: 4,
    height: ITEM_H, borderRadius: 12, zIndex: 0,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)',
    overflow: 'hidden',
  },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.5 },
  fadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.5 },
});


// ─── Decade Quick-Jump Chips ────────────────────────────────────

function DecadeChips({ selectedYear, onSelect, lang }) {
  var decades = [
    { label: '40s–50s', start: 1945 },
    { label: '60s', start: 1965 },
    { label: '70s', start: 1975 },
    { label: '80s', start: 1985 },
    { label: '90s', start: 1995 },
    { label: '00s', start: 2005 },
    { label: '10s+', start: 2015 },
  ];
  return (
    <View style={dc.row}>
      {decades.map(function (d) {
        var isActive = Math.abs(selectedYear - d.start) < 8;
        return (
          <TouchableOpacity
            key={d.label}
            style={[dc.chip, isActive && dc.chipActive]}
            onPress={function () { onSelect(d.start); }}
            activeOpacity={0.7}
          >
            <Text style={[dc.chipText, isActive && dc.chipTextActive]}>{d.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

var dc = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14, justifyContent: 'center' },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderColor: 'rgba(255,140,0,0.35)',
  },
  chipText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#FFB800' },
});


// ─── Minute Quick-Select Chips ──────────────────────────────────

function MinuteChips({ selected, onSelect }) {
  var quickMins = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  return (
    <View style={mc.row}>
      {quickMins.map(function (m) {
        var isActive = selected === m;
        return (
          <TouchableOpacity
            key={m}
            style={[mc.chip, isActive && mc.chipActive]}
            onPress={function () { onSelect(m); }}
            activeOpacity={0.7}
          >
            <Text style={[mc.chipText, isActive && mc.chipTextActive]}>{pad(m)}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

var mc = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12, justifyContent: 'center' },
  chip: {
    width: 40, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: {
    backgroundColor: 'rgba(96,165,250,0.15)',
    borderColor: 'rgba(96,165,250,0.35)',
  },
  chipText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#93C5FD' },
});


// ─── Date Picker Modal ──────────────────────────────────────────

function DatePickerModal({ visible, onClose, value, onChange, lang }) {
  var parts = (value || '2000-01-01').split('-');
  var initY = parseInt(parts[0], 10) || 2000;
  var initM = parseInt(parts[1], 10) || 1;
  var initD = parseInt(parts[2], 10) || 1;

  var [year, setYear] = useState(initY);
  var [month, setMonth] = useState(initM);
  var [day, setDay] = useState(initD);

  useEffect(function () {
    if (visible) {
      var p = (value || '2000-01-01').split('-');
      setYear(parseInt(p[0], 10) || 2000);
      setMonth(parseInt(p[1], 10) || 1);
      setDay(parseInt(p[2], 10) || 1);
    }
  }, [visible]);

  var years = useMemo(function () { return range(1930, 2026); }, []);
  var months = useMemo(function () { return range(1, 12); }, []);
  var maxDay = daysInMonth(year, month);
  var days = useMemo(function () { return range(1, maxDay); }, [maxDay]);
  var safeDay = day > maxDay ? maxDay : day;

  var monthNames = lang === 'si' ? MONTHS_SI : MONTHS_EN;
  var dayName = getDayOfWeek(year, month, safeDay, lang);
  var monthFull = lang === 'si' ? monthNames[month - 1] : MONTHS_FULL_EN[month - 1];

  function handleConfirm() {
    onChange(year + '-' + pad(month) + '-' + pad(safeDay));
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} style={ms.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View entering={SlideInDown.duration(350).springify()} style={ms.sheet}>
          <LinearGradient colors={['rgba(30,15,60,0.98)', 'rgba(10,5,30,0.98)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

          {/* Handle bar */}
          <View style={ms.handleBar} />

          <View style={ms.header}>
            <View>
              <Text style={ms.headerTitle}>{lang === 'si' ? 'උපන් දිනය තෝරන්න' : 'Select Birth Date'}</Text>
              <Text style={ms.headerSub}>{lang === 'si' ? 'වර්ෂය, මාසය සහ දිනය තෝරන්න' : 'Choose year, month and day'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          {/* Decade quick-jump */}
          <Text style={ms.quickLabel}>{lang === 'si' ? 'ඉක්මන් තේරීම' : 'Quick jump'}</Text>
          <DecadeChips selectedYear={year} onSelect={setYear} lang={lang} />

          <View style={ms.colLabels}>
            <Text style={[ms.colLabel, { flex: 1.2 }]}>{lang === 'si' ? 'වර්ෂය' : 'Year'}</Text>
            <Text style={[ms.colLabel, { flex: 1 }]}>{lang === 'si' ? 'මාසය' : 'Month'}</Text>
            <Text style={[ms.colLabel, { flex: 0.8 }]}>{lang === 'si' ? 'දිනය' : 'Day'}</Text>
          </View>

          <View style={ms.wheelRow}>
            <WheelColumn data={years} selected={year} onSelect={setYear} width={null} />
            <WheelColumn
              data={months}
              selected={month}
              onSelect={setMonth}
              formatItem={function (m) { return monthNames[m - 1] || pad(m); }}
            />
            <WheelColumn data={days} selected={safeDay} onSelect={setDay} formatItem={pad} />
          </View>

          {/* Rich date preview with day of week */}
          <View style={ms.preview}>
            <Text style={ms.previewDay}>{dayName}</Text>
            <Text style={ms.previewText}>{safeDay + ' ' + monthFull + ' ' + year}</Text>
          </View>

          <TouchableOpacity style={ms.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
            <LinearGradient colors={['#FF8C00', '#FF6D00', '#E65100']} style={ms.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={ms.confirmText}>{lang === 'si' ? 'තහවුරු කරන්න' : 'Confirm Date'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}


// ─── Time Picker Modal ──────────────────────────────────────────

function TimePickerModal({ visible, onClose, value, onChange, lang }) {
  var parts = (value || '12:00').split(':');
  var initH = parseInt(parts[0], 10);
  if (isNaN(initH)) initH = 12;
  var initM = parseInt(parts[1], 10) || 0;

  // Store in 12h + AM/PM internally for better UX
  var [hour12, setHour12] = useState(initH === 0 ? 12 : initH > 12 ? initH - 12 : initH);
  var [minute, setMinute] = useState(initM);
  var [isAM, setIsAM] = useState(initH < 12);

  useEffect(function () {
    if (visible) {
      var p = (value || '12:00').split(':');
      var h24 = parseInt(p[0], 10);
      if (isNaN(h24)) h24 = 12;
      var m = parseInt(p[1], 10) || 0;
      setHour12(h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24);
      setMinute(m);
      setIsAM(h24 < 12);
    }
  }, [visible]);

  var hours12 = useMemo(function () { return range(1, 12); }, []);
  var minutes = useMemo(function () { return range(0, 59); }, []);

  // Convert 12h + AM/PM to 24h
  function to24(h12, am) {
    if (am) return h12 === 12 ? 0 : h12;
    return h12 === 12 ? 12 : h12 + 12;
  }

  function handleConfirm() {
    var h24 = to24(hour12, isAM);
    onChange(pad(h24) + ':' + pad(minute));
    onClose();
  }

  var h24 = to24(hour12, isAM);
  var periodLabel = isAM
    ? (lang === 'si' ? 'පෙ.ව.' : 'AM')
    : (lang === 'si' ? 'ප.ව.' : 'PM');
  var periodIcon = isAM ? 'sunny-outline' : 'moon-outline';
  var periodDesc = isAM
    ? (lang === 'si' ? 'උදේ / පෙරවරු' : 'Morning')
    : (lang === 'si' ? 'සවස / රාත්‍රි' : 'Afternoon / Night');

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} style={ms.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View entering={SlideInDown.duration(350).springify()} style={ms.sheet}>
          <LinearGradient colors={['rgba(30,15,60,0.98)', 'rgba(10,5,30,0.98)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

          {/* Handle bar */}
          <View style={ms.handleBar} />

          <View style={ms.header}>
            <View>
              <Text style={ms.headerTitle}>{lang === 'si' ? 'උපන් වේලාව තෝරන්න' : 'Select Birth Time'}</Text>
              <Text style={ms.headerSub}>{lang === 'si' ? 'හරියටම දන්නේ නැත්නම් ආසන්නතම වේලාව තෝරන්න' : 'Choose the closest time if exact is unknown'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          {/* AM/PM Toggle */}
          <View style={tp.toggleRow}>
            <TouchableOpacity
              style={[tp.toggleBtn, isAM && tp.toggleBtnActive]}
              onPress={function () { setIsAM(true); }}
              activeOpacity={0.7}
            >
              {isAM && <LinearGradient colors={['rgba(255,183,0,0.2)', 'rgba(255,140,0,0.1)']} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />}
              <Ionicons name="sunny-outline" size={18} color={isAM ? '#FFB800' : 'rgba(255,255,255,0.3)'} />
              <Text style={[tp.toggleText, isAM && tp.toggleTextActive]}>{lang === 'si' ? 'පෙ.ව.' : 'AM'}</Text>
              <Text style={[tp.toggleSub, isAM && tp.toggleSubActive]}>{lang === 'si' ? 'උදේ' : 'Morning'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[tp.toggleBtn, !isAM && tp.toggleBtnActive]}
              onPress={function () { setIsAM(false); }}
              activeOpacity={0.7}
            >
              {!isAM && <LinearGradient colors={['rgba(99,102,241,0.2)', 'rgba(147,51,234,0.1)']} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />}
              <Ionicons name="moon-outline" size={18} color={!isAM ? '#A78BFA' : 'rgba(255,255,255,0.3)'} />
              <Text style={[tp.toggleText, !isAM && tp.toggleTextActive]}>{lang === 'si' ? 'ප.ව.' : 'PM'}</Text>
              <Text style={[tp.toggleSub, !isAM && tp.toggleSubActive]}>{lang === 'si' ? 'සවස/රෑ' : 'Afternoon'}</Text>
            </TouchableOpacity>
          </View>

          <View style={ms.colLabels}>
            <Text style={[ms.colLabel, { flex: 1 }]}>{lang === 'si' ? 'පැය' : 'Hour'}</Text>
            <Text style={[ms.colLabel, { flex: 1 }]}>{lang === 'si' ? 'මිනිත්තු' : 'Minute'}</Text>
          </View>

          <View style={ms.wheelRow}>
            <WheelColumn data={hours12} selected={hour12} onSelect={setHour12} />
            <View style={ms.wheelSep}><Text style={ms.wheelSepText}>:</Text></View>
            <WheelColumn data={minutes} selected={minute} onSelect={setMinute} formatItem={pad} />
          </View>

          {/* Quick minute selector */}
          <Text style={ms.quickLabel}>{lang === 'si' ? 'විනාඩි ඉක්මන් තේරීම' : 'Quick select minutes'}</Text>
          <MinuteChips selected={minute} onSelect={setMinute} />

          {/* Time preview */}
          <View style={ms.preview}>
            <View style={ms.previewTimeRow}>
              <Ionicons name={periodIcon} size={18} color={isAM ? '#FFB800' : '#A78BFA'} style={{ marginRight: 8 }} />
              <Text style={ms.previewText}>{hour12 + ':' + pad(minute) + ' ' + periodLabel}</Text>
            </View>
            <Text style={ms.preview24}>{pad(h24) + ':' + pad(minute) + ' · ' + periodDesc}</Text>
          </View>

          <TouchableOpacity style={ms.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
            <LinearGradient colors={['#FF8C00', '#FF6D00', '#E65100']} style={ms.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={ms.confirmText}>{lang === 'si' ? 'තහවුරු කරන්න' : 'Confirm Time'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// AM/PM toggle styles
var tp = StyleSheet.create({
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  toggleBtnActive: {
    borderColor: 'rgba(255,140,0,0.3)',
  },
  toggleText: { color: 'rgba(255,255,255,0.35)', fontSize: 15, fontWeight: '800' },
  toggleTextActive: { color: '#FFE8B0' },
  toggleSub: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '500' },
  toggleSubActive: { color: 'rgba(255,232,176,0.5)' },
});

var ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    maxWidth: 500, width: '100%', alignSelf: 'center',
  },
  handleBar: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginBottom: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: { color: '#E9D5FF', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  headerSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500', marginTop: 3 },
  quickLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  colLabels: { flexDirection: 'row', marginBottom: 4, paddingHorizontal: 4 },
  colLabel: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  wheelRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'center' },
  wheelSep: { width: 20, alignItems: 'center', justifyContent: 'center' },
  wheelSepText: { color: 'rgba(255,255,255,0.25)', fontSize: 28, fontWeight: '300' },
  preview: {
    alignItems: 'center', marginBottom: 16, paddingVertical: 12,
    backgroundColor: 'rgba(147,51,234,0.06)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.15)',
  },
  previewDay: { color: 'rgba(255,140,0,0.7)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  previewText: { color: '#E9D5FF', fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  previewTimeRow: { flexDirection: 'row', alignItems: 'center' },
  preview24: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 4, fontWeight: '500' },
  confirmBtn: { borderRadius: 14, overflow: 'hidden' },
  confirmGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  confirmText: { color: '#FFF1D0', fontSize: 15, fontWeight: '800' },
});


// ─── Tappable Field Components ──────────────────────────────────

export function DatePickerField({ value, onChange, label, lang, style, error }) {
  var [open, setOpen] = useState(false);

  var display = value || '----/--/--';
  var dayLabel = '';
  try {
    var parts = value.split('-');
    if (parts.length === 3) {
      var y = parseInt(parts[0], 10);
      var mIdx = parseInt(parts[1], 10) - 1;
      var d = parseInt(parts[2], 10);
      var mNames = lang === 'si' ? MONTHS_SI : MONTHS_EN;
      display = parts[2] + ' ' + (mNames[mIdx] || parts[1]) + ' ' + parts[0];
      dayLabel = getDayOfWeek(y, mIdx + 1, d, lang);
    }
  } catch (_) {}

  return (
    <>
      <TouchableOpacity style={[fs.field, error && fs.fieldError, style]} onPress={function () { setOpen(true); }} activeOpacity={0.7}>
        <View style={fs.iconWrap}>
          <Ionicons name="calendar-outline" size={18} color="#A78BFA" />
        </View>
        <View style={fs.fieldContent}>
          <Text style={fs.fieldText}>{display}</Text>
          {dayLabel ? <Text style={fs.fieldSub}>{dayLabel}</Text> : null}
        </View>
        <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
      <DatePickerModal visible={open} onClose={function () { setOpen(false); }} value={value} onChange={onChange} lang={lang} />
    </>
  );
}

export function TimePickerField({ value, onChange, label, lang, style, error }) {
  var [open, setOpen] = useState(false);

  var display = value || '--:--';
  var periodLabel = '';
  try {
    var parts = value.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var ampm = h < 12 ? 'AM' : 'PM';
    var h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    display = h12 + ':' + m;
    periodLabel = lang === 'si' ? (h < 12 ? 'පෙ.ව.' : 'ප.ව.') : ampm;
  } catch (_) {}

  return (
    <>
      <TouchableOpacity style={[fs.field, error && fs.fieldError, style]} onPress={function () { setOpen(true); }} activeOpacity={0.7}>
        <View style={fs.iconWrap}>
          <Ionicons name="time-outline" size={18} color="#60A5FA" />
        </View>
        <View style={fs.fieldContent}>
          <Text style={fs.fieldText}>{display}</Text>
          {periodLabel ? <Text style={fs.fieldSub}>{periodLabel}</Text> : null}
        </View>
        <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
      <TimePickerModal visible={open} onClose={function () { setOpen(false); }} value={value} onChange={onChange} lang={lang} />
    </>
  );
}

var fs = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(24,30,72,0.65)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  fieldError: { borderColor: 'rgba(239,68,68,0.5)' },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(147,51,234,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fieldContent: { flex: 1 },
  fieldText: { color: '#FFE8B0', fontSize: 15, fontWeight: '700' },
  fieldSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '500', marginTop: 2 },
});
