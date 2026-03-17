/**
 * CosmicDateTimePicker — beautiful cosmic-themed date & time picker modals.
 *
 * Exports two components:
 *   <DatePickerField />  — tappable field + modal for YYYY-MM-DD
 *   <TimePickerField />  — tappable field + modal for HH:MM
 *
 * Works on Web, iOS, and Android with no native dependencies.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';

const { width: W } = Dimensions.get('window');
const ITEM_H = 44;
const VISIBLE = 5;
const LIST_H = ITEM_H * VISIBLE;

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_SI = ['ජන', 'පෙබ', 'මාර්', 'අප්\u200D', 'මැයි', 'ජුනි', 'ජුලි', 'අගෝ', 'සැප්', 'ඔක්', 'නොවැ', 'දෙසැ'];

function range(start, end) {
  var arr = [];
  for (var i = start; i <= end; i++) arr.push(i);
  return arr;
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

// ─── Scroll Column ───────────────────────────────────────────────

function WheelColumn({ data, selected, onSelect, formatItem, width }) {
  var listRef = useRef(null);
  var idx = data.indexOf(selected);
  if (idx < 0) idx = 0;

  useEffect(function () {
    if (listRef.current) {
      try {
        listRef.current.scrollToOffset({ offset: idx * ITEM_H, animated: false });
      } catch (_) {}
    }
  }, []);

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
      />
    </View>
  );
}

var ws = StyleSheet.create({
  col: { flex: 1 },
  item: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  itemActive: { backgroundColor: 'rgba(147,51,234,0.2)', borderRadius: 10 },
  itemText: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' },
  itemTextActive: { color: '#E9D5FF', fontSize: 18, fontWeight: '800' },
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

  var years = range(1930, 2026);
  var months = range(1, 12);
  var maxDay = daysInMonth(year, month);
  var days = range(1, maxDay);
  var safeDay = day > maxDay ? maxDay : day;

  var monthNames = lang === 'si' ? MONTHS_SI : MONTHS_EN;

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

          <View style={ms.header}>
            <Text style={ms.headerTitle}>{lang === 'si' ? 'උපන් දිනය තෝරන්න' : 'Select Date'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

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

          <View style={ms.preview}>
            <Text style={ms.previewText}>{year + '-' + pad(month) + '-' + pad(safeDay)}</Text>
          </View>

          <TouchableOpacity style={ms.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
            <LinearGradient colors={['#7C3AED', '#9333EA', '#A855F7']} style={ms.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={ms.confirmText}>{lang === 'si' ? 'තහවුරු කරන්න' : 'Confirm'}</Text>
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
  var initH = parseInt(parts[0], 10) || 12;
  var initM = parseInt(parts[1], 10) || 0;

  var [hour, setHour] = useState(initH);
  var [minute, setMinute] = useState(initM);

  useEffect(function () {
    if (visible) {
      var p = (value || '12:00').split(':');
      setHour(parseInt(p[0], 10) || 12);
      setMinute(parseInt(p[1], 10) || 0);
    }
  }, [visible]);

  var hours = range(0, 23);
  var minutes = range(0, 59);

  function formatHour(h) {
    var ampm = h < 12 ? 'AM' : 'PM';
    var display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return display + ' ' + ampm;
  }

  function handleConfirm() {
    onChange(pad(hour) + ':' + pad(minute));
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} style={ms.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View entering={SlideInDown.duration(350).springify()} style={ms.sheet}>
          <LinearGradient colors={['rgba(30,15,60,0.98)', 'rgba(10,5,30,0.98)']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

          <View style={ms.header}>
            <Text style={ms.headerTitle}>{lang === 'si' ? 'උපන් වේලාව තෝරන්න' : 'Select Time'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          <View style={ms.colLabels}>
            <Text style={[ms.colLabel, { flex: 1 }]}>{lang === 'si' ? 'පැය' : 'Hour'}</Text>
            <Text style={[ms.colLabel, { flex: 1 }]}>{lang === 'si' ? 'මිනිත්තු' : 'Minute'}</Text>
          </View>

          <View style={ms.wheelRow}>
            <WheelColumn data={hours} selected={hour} onSelect={setHour} formatItem={formatHour} />
            <WheelColumn data={minutes} selected={minute} onSelect={setMinute} formatItem={pad} />
          </View>

          <View style={ms.preview}>
            <Text style={ms.previewText}>{formatHour(hour).replace(' ', ':')} : {pad(minute)}</Text>
            <Text style={ms.preview24}>{pad(hour) + ':' + pad(minute)}</Text>
          </View>

          <TouchableOpacity style={ms.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
            <LinearGradient colors={['#7C3AED', '#9333EA', '#A855F7']} style={ms.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={ms.confirmText}>{lang === 'si' ? 'තහවුරු කරන්න' : 'Confirm'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

var ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxWidth: 500, width: '100%', alignSelf: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { color: '#E9D5FF', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  colLabels: { flexDirection: 'row', marginBottom: 6, paddingHorizontal: 4 },
  colLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
  wheelRow: { flexDirection: 'row', marginBottom: 16 },
  preview: { alignItems: 'center', marginBottom: 16, paddingVertical: 10, backgroundColor: 'rgba(147,51,234,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(147,51,234,0.2)' },
  previewText: { color: '#C084FC', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  preview24: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2 },
  confirmBtn: { borderRadius: 14, overflow: 'hidden' },
  confirmGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  confirmText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});


// ─── Tappable Field Components ──────────────────────────────────

export function DatePickerField({ value, onChange, label, lang, style, error }) {
  var [open, setOpen] = useState(false);

  var display = value || '----/--/--';
  try {
    var parts = value.split('-');
    if (parts.length === 3) {
      var mIdx = parseInt(parts[1], 10) - 1;
      var mNames = lang === 'si' ? MONTHS_SI : MONTHS_EN;
      display = parts[2] + ' ' + (mNames[mIdx] || parts[1]) + ' ' + parts[0];
    }
  } catch (_) {}

  return (
    <>
      <TouchableOpacity style={[fs.field, error && fs.fieldError, style]} onPress={function () { setOpen(true); }} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={18} color="#A78BFA" style={fs.icon} />
        <Text style={fs.fieldText}>{display}</Text>
        <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
      <DatePickerModal visible={open} onClose={function () { setOpen(false); }} value={value} onChange={onChange} lang={lang} />
    </>
  );
}

export function TimePickerField({ value, onChange, label, lang, style, error }) {
  var [open, setOpen] = useState(false);

  var display = value || '--:--';
  try {
    var parts = value.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1];
    var ampm = h < 12 ? 'AM' : 'PM';
    var h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    display = h12 + ':' + m + ' ' + ampm;
  } catch (_) {}

  return (
    <>
      <TouchableOpacity style={[fs.field, error && fs.fieldError, style]} onPress={function () { setOpen(true); }} activeOpacity={0.7}>
        <Ionicons name="time-outline" size={18} color="#60A5FA" style={fs.icon} />
        <Text style={fs.fieldText}>{display}</Text>
        <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
      <TimePickerModal visible={open} onClose={function () { setOpen(false); }} value={value} onChange={onChange} lang={lang} />
    </>
  );
}

var fs = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(24,30,72,0.65)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  fieldError: { borderColor: 'rgba(239,68,68,0.5)' },
  icon: { marginRight: 10 },
  fieldText: { flex: 1, color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
});
