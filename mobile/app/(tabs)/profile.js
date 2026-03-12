import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import CosmicBackground from '../../components/CosmicBackground';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

const SRI_LANKAN_CITIES = [
  { name: 'Colombo', lat: '6.9271', lng: '79.8612' },
  { name: 'Kandy', lat: '7.2906', lng: '80.6337' },
  { name: 'Galle', lat: '6.0535', lng: '80.2210' },
  { name: 'Jaffna', lat: '9.6615', lng: '80.0255' },
  { name: 'Matara', lat: '5.9549', lng: '80.5550' },
  { name: 'Anuradhapura', lat: '8.3114', lng: '80.4037' },
  { name: 'Trincomalee', lat: '8.5874', lng: '81.2152' },
  { name: 'Kurunegala', lat: '7.4863', lng: '80.3647' },
  { name: 'Ratnapura', lat: '6.7056', lng: '80.3847' },
  { name: 'Batticaloa', lat: '7.7310', lng: '81.6747' },
  { name: 'Badulla', lat: '6.9897', lng: '81.0557' },
  { name: 'Nuwara Eliya', lat: '6.9497', lng: '80.7891' },
  { name: 'Puttalam', lat: '8.0362', lng: '79.8283' },
  { name: 'Hambantota', lat: '6.1429', lng: '81.1185' },
  { name: 'Gampaha', lat: '7.0840', lng: '79.9939' }
];

function AuraBox({ children, style }) {
  return (
    <View style={[gs.box, style]}>
      <LinearGradient
        colors={['rgba(20, 80, 150, 0.3)', 'rgba(10, 30, 80, 0.4)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />
      <View style={gs.innerGlow} />
      {children}
    </View>
  );
}
var gs = StyleSheet.create({
  box: {
    borderRadius: 24, overflow: 'hidden', borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)', padding: 20, marginBottom: 16,
    shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 24,
  }
});

function SettingItem({ icon, title, value, type = 'nav', onPress, onToggle }) {
  return (
    <TouchableOpacity style={s.settingRow} onPress={onPress} disabled={type === 'switch'}>
      <View style={s.settingIconWrapper}>
        <LinearGradient colors={['rgba(56, 189, 248, 0.2)', 'transparent']} style={StyleSheet.absoluteFill} />
        <Ionicons name={icon} size={20} color="#7dd3fc" />
      </View>
      <View style={s.settingLeft}>
        <Text style={s.settingTitle}>{title}</Text>
      </View>
      {type === 'nav' ? (
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(56, 189, 248, 0.5)' }}
          thumbColor={value ? '#38bdf8' : '#cbd5e1'}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Auth Form Component ────────────────────────────────────────
function PhoneAuthForm({ onSuccess }) {
  var [phone, setPhone] = useState('');
  var [otp, setOtp] = useState('');
  var [referenceNo, setReferenceNo] = useState(null);
  var [devOtp, setDevOtp] = useState(null);
  var [step, setStep] = useState('phone'); // 'phone' or 'otp'
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var { sendOtp, verifyAndLogin } = useAuth();

  async function handleSendOtp() {
    if (!phone || phone.length < 9) { setError('Enter a valid phone number'); return; }
    setError(''); setLoading(true);
    try {
      var result = await sendOtp(phone);
      setReferenceNo(result.referenceNo);
      if (result._devOtp) setDevOtp(result._devOtp);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  }

  async function handleVerify() {
    if (!otp || otp.length < 4) { setError('Enter the OTP code'); return; }
    setError(''); setLoading(true);
    try {
      await verifyAndLogin(phone, otp, referenceNo);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally { setLoading(false); }
  }

  return (
    <AuraBox>
      <View style={s.authHeader}>
        <Ionicons name="sparkles" size={28} color="#c084fc" />
        <Text style={s.authTitle}>{step === 'phone' ? 'Sign In' : 'Verify OTP'}</Text>
        <Text style={s.authSubtitle}>{step === 'phone' ? 'Enter your phone number' : 'Enter the code sent to ' + phone}</Text>
      </View>

      {step === 'phone' && (
        <>
          <TextInput style={s.input} placeholder="07X XXX XXXX" placeholderTextColor="rgba(255,255,255,0.3)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={12} />
          {error ? <Text style={s.errorText}>{error}</Text> : null}
          <TouchableOpacity style={s.authButton} onPress={handleSendOtp} disabled={loading}>
            <LinearGradient colors={['#7c3aed', '#6366f1']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.authButtonText}>📱 Send OTP</Text>}
          </TouchableOpacity>
        </>
      )}

      {step === 'otp' && (
        <>
          {devOtp && (
            <View style={{ backgroundColor: 'rgba(251,191,36,0.15)', padding: 10, borderRadius: 10, marginBottom: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fbbf24', fontSize: 12 }}>🧪 Dev OTP: {devOtp}</Text>
            </View>
          )}
          <TextInput style={[s.input, { fontSize: 24, letterSpacing: 6, textAlign: 'center', fontWeight: '800' }]} placeholder="Enter OTP" placeholderTextColor="rgba(255,255,255,0.3)" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
          {error ? <Text style={s.errorText}>{error}</Text> : null}
          <TouchableOpacity style={s.authButton} onPress={handleVerify} disabled={loading}>
            <LinearGradient colors={['#059669', '#10b981']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.authButtonText}>✓ Verify & Sign In</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.switchModeBtn} onPress={function() { setStep('phone'); setOtp(''); setError(''); }}>
            <Text style={s.switchModeText}>← Change phone number</Text>
          </TouchableOpacity>
        </>
      )}
    </AuraBox>
  );
}

// ─── Birth Data Form ────────────────────────────────────────────
function BirthDataForm({ currentData, onSave }) {
  var [day, setDay] = useState('');
  var [month, setMonth] = useState('');
  var [year, setYear] = useState('');
  var [hour, setHour] = useState('');
  var [minute, setMinute] = useState('');
  
  var [location, setLocation] = useState(currentData?.locationName || '');
  var [lat, setLat] = useState(currentData?.lat || 6.9271);
  var [lng, setLng] = useState(currentData?.lng || 79.8612);
  var [saving, setSaving] = useState(false);
  var [showCityModal, setShowCityModal] = useState(false);

  useEffect(function() {
    if (currentData && currentData.dateTime) {
      try {
        var parts = currentData.dateTime.split('T');
        var dParts = parts[0].split('-');
        var tParts = parts[1].substring(0, 5).split(':');
        setYear(dParts[0] || '');
        setMonth(dParts[1] || '');
        setDay(dParts[2] || '');
        setHour(tParts[0] || '');
        setMinute(tParts[1] || '');
        
        setLocation(currentData.locationName || '');
        setLat(currentData.lat || 6.9271);
        setLng(currentData.lng || 79.8612);
      } catch (e) {
        console.log('Error parsing date', e);
      }
    }
  }, [currentData]);

  async function handleSave() {
    if (!day || !month || !year) { Alert.alert('Required', 'Please enter your birth date'); return; }
    
    // Simple validation
    var d = parseInt(day);
    var m = parseInt(month);
    var y = parseInt(year);
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
      Alert.alert('Invalid Date', 'Please enter a valid date'); return;
    }

    setSaving(true);
    try {
      // Pad single digits
      var pad = (n) => n.toString().padStart(2, '0');
      var dateStr = `${year}-${pad(month)}-${pad(day)}`;
      var timeStr = `${pad(hour || 0)}:${pad(minute || 0)}`;
      var dateTime = dateStr + 'T' + timeStr + ':00';
      
      await onSave({ 
        dateTime: dateTime, 
        lat: lat, 
        lng: lng, 
        locationName: location || 'Colombo', 
        timezone: 'Asia/Colombo' 
      });
      Alert.alert('✨ Saved', 'Your birth data has been saved!');
    } catch (err) { Alert.alert('Error', 'Failed to save birth data'); }
    finally { setSaving(false); }
  }

  function handleSelectCity(city) {
    setLocation(city.name);
    setLat(city.lat);
    setLng(city.lng);
    setShowCityModal(false);
  }

  return (
    <AuraBox>
      <Text style={s.sectionTitle}>🌟 Your Birth Details</Text>
      <Text style={s.sectionHint}>This personalizes all your readings and reports</Text>
      
      <Text style={s.inputLabel}>Birth Date (DD / MM / YYYY)</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <TextInput 
          style={[s.input, { flex: 1, marginBottom: 0, textAlign: 'center' }]} 
          placeholder="DD" 
          placeholderTextColor="rgba(255,255,255,0.3)" 
          value={day} 
          onChangeText={setDay} 
          keyboardType="number-pad" 
          maxLength={2}
        />
        <TextInput 
          style={[s.input, { flex: 1, marginBottom: 0, textAlign: 'center' }]} 
          placeholder="MM" 
          placeholderTextColor="rgba(255,255,255,0.3)" 
          value={month} 
          onChangeText={setMonth} 
          keyboardType="number-pad" 
          maxLength={2}
        />
        <TextInput 
          style={[s.input, { flex: 1.5, marginBottom: 0, textAlign: 'center' }]} 
          placeholder="YYYY" 
          placeholderTextColor="rgba(255,255,255,0.3)" 
          value={year} 
          onChangeText={setYear} 
          keyboardType="number-pad" 
          maxLength={4}
        />
      </View>

      <Text style={s.inputLabel}>Birth Time (HH : MM - 24hr format)</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <TextInput 
          style={[s.input, { flex: 1, marginBottom: 0, textAlign: 'center' }]} 
          placeholder="HH" 
          placeholderTextColor="rgba(255,255,255,0.3)" 
          value={hour} 
          onChangeText={setHour} 
          keyboardType="number-pad" 
          maxLength={2}
        />
        <Text style={{ color: '#fff', fontSize: 24, alignSelf: 'center', fontWeight: 'bold' }}>:</Text>
        <TextInput 
          style={[s.input, { flex: 1, marginBottom: 0, textAlign: 'center' }]} 
          placeholder="MM" 
          placeholderTextColor="rgba(255,255,255,0.3)" 
          value={minute} 
          onChangeText={setMinute} 
          keyboardType="number-pad" 
          maxLength={2}
        />
      </View>
      
      <Text style={s.inputLabel}>Birth Place</Text>
      <TouchableOpacity onPress={() => setShowCityModal(true)} style={[s.input, { justifyContent: 'center' }]}>
        <Text style={{ color: location ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 16 }}>
          {location || 'Select City...'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', right: 12 }} />
      </TouchableOpacity>

      <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
        <LinearGradient colors={['#059669', '#10b981']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>💾 Save Birth Data</Text>}
      </TouchableOpacity>

      <Modal visible={showCityModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Birth City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={SRI_LANKAN_CITIES}
              keyExtractor={item => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.cityItem} onPress={() => handleSelectCity(item)}>
                  <Ionicons name="location-sharp" size={18} color="#fbbf24" style={{ marginRight: 12 }} />
                  <Text style={s.cityText}>{item.name}</Text>
                  {location === item.name && <Ionicons name="checkmark" size={18} color="#10b981" style={{ marginLeft: 'auto' }} />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={s.separator} />}
            />
          </View>
        </View>
      </Modal>
    </AuraBox>
  );
}

// ─── Main Profile Screen ────────────────────────────────────────
export default function ProfileScreen() {
  var { language, switchLanguage, t } = useLanguage();
  var { user, profile, loading, isLoggedIn, subscription, isSubscribed,
        signOut, saveBirthData, activateSubscription, cancelSubscription, renewSubscription } = useAuth();

  if (loading) {
    return (
      <CosmicBackground>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#7dd3fc" />
          <Text style={s.loadingText}>Loading your cosmic profile...</Text>
        </View>
      </CosmicBackground>
    );
  }

  var displayName = user?.displayName || t('seeker');
  var phone = user?.phone || '';
  var birthData = user?.birthData || null;
  var reportCount = user?.reportCount || 0;
  var chatCount = user?.chatCount || 0;
  var subStatus = subscription?.status || 'none';

  return (
    <CosmicBackground>
      <ScrollView style={s.flex} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).duration(800)}>
          <Text style={s.title}>{t('tabProfile')}</Text>
          <Text style={s.subtitle}>{isLoggedIn ? 'Your cosmic identity' : t('manageIdentity')}</Text>
        </Animated.View>

        {!isLoggedIn && (
          <Animated.View entering={FadeInDown.delay(200).duration(800)}>
            <PhoneAuthForm />
          </Animated.View>
        )}

        {isLoggedIn && (
          <>
            <Animated.View entering={FadeInDown.delay(200).duration(800)}>
              <View style={s.avatarContainer}>
                <LinearGradient colors={['#7c3aed', '#c084fc']} style={s.avatarOuterRing} />
                <View style={s.avatarInner}>
                  <Ionicons name="person" size={40} color="#bae6fd" />
                </View>
                <View style={[s.editBadge, { backgroundColor: isSubscribed ? '#10b981' : '#f59e0b' }]}>
                  <Ionicons name={isSubscribed ? 'checkmark' : 'star'} size={14} color="#fff" />
                </View>
              </View>
              <Text style={s.userName}>{displayName}</Text>
              <Text style={s.userConstellation}>{phone ? '📱 ' + phone : ''}</Text>
              {birthData && (
                <Text style={s.birthDataBadge}>
                  🌙 Born: {birthData.dateTime?.split('T')[0]} at {birthData.dateTime?.split('T')[1]?.substring(0,5)} • {birthData.locationName || 'Colombo'}
                </Text>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(800)}>
              <View style={s.statsRow}>
                <View style={s.statItem}><Text style={s.statNumber}>{reportCount}</Text><Text style={s.statLabel}>Reports</Text></View>
                <View style={s.statDivider} />
                <View style={s.statItem}><Text style={s.statNumber}>{chatCount}</Text><Text style={s.statLabel}>Chats</Text></View>
                <View style={s.statDivider} />
                <View style={s.statItem}><Text style={s.statNumber}>{birthData ? '✓' : '—'}</Text><Text style={s.statLabel}>Birth Data</Text></View>
              </View>
            </Animated.View>

            {/* Subscription Status */}
            <Animated.View entering={FadeInDown.delay(280).duration(800)}>
              <AuraBox>
                <Text style={s.sectionTitle}>💎 Subscription</Text>
                {subStatus === 'active' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                      <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 15, marginLeft: 8 }}>Active — LKR {subscription?.amount || 8}/day</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>
                      Charged from your mobile credit
                    </Text>
                    <TouchableOpacity style={[s.guestButton, { borderColor: 'rgba(248,113,113,0.3)' }]} onPress={function() {
                      if (Platform.OS === 'web') {
                        if (window.confirm('Are you sure you want to cancel your subscription?')) {
                          cancelSubscription();
                        }
                      } else {
                        Alert.alert('Cancel Subscription', 'Are you sure you want to cancel?', [
                          { text: 'Keep', style: 'cancel' },
                          { text: 'Cancel', style: 'destructive', onPress: function() { cancelSubscription(); } },
                        ]);
                      }
                    }}>
                      <Text style={{ color: '#f87171', fontWeight: '600', fontSize: 13 }}>Cancel Subscription</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {(subStatus === 'expired' || subStatus === 'none' || subStatus === 'pending' || subStatus === 'cancelled') && (
                  <View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 16 }}>
                      {subStatus === 'expired' ? 'Your subscription has expired.' : subStatus === 'cancelled' ? 'Subscription cancelled.' : 'Subscribe for full access to all features.'}
                    </Text>
                    <TouchableOpacity style={s.authButton} onPress={function() {
                      (subStatus === 'expired' ? renewSubscription() : activateSubscription())
                        .then(function(r) { if (r.success) Alert.alert('✨ Success', r.message || 'Subscribed!'); })
                        .catch(function(e) { Alert.alert('Payment Failed', e.message || 'Insufficient mobile credit'); });
                    }}>
                      <LinearGradient colors={['#f59e0b', '#f97316']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
                      <Text style={s.authButtonText}>{subStatus === 'expired' ? '🔄 Renew — LKR 8' : '💳 Subscribe — LKR 8/day'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </AuraBox>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(800)}>
              <BirthDataForm currentData={birthData} onSave={saveBirthData} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(800)}>
              <AuraBox>
                <Text style={s.sectionTitle}>{t('language')}</Text>
                <View style={s.langContainer}>
                  <TouchableOpacity style={[s.langBtn, language === 'en' && s.langBtnActive]} onPress={function() { switchLanguage('en'); }}>
                    {language === 'en' && <LinearGradient colors={['#38bdf8', '#818cf8']} style={StyleSheet.absoluteFill} />}
                    <Text style={[s.langText, language === 'en' && s.langTextActive]}>English</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.langBtn, language === 'si' && s.langBtnActive]} onPress={function() { switchLanguage('si'); }}>
                    {language === 'si' && <LinearGradient colors={['#38bdf8', '#818cf8']} style={StyleSheet.absoluteFill} />}
                    <Text style={[s.langText, language === 'si' && s.langTextActive]}>සිංහල</Text>
                  </TouchableOpacity>
                </View>
              </AuraBox>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).duration(800)}>
              <AuraBox>
                <Text style={s.sectionTitle}>{t('notifications')}</Text>
                <SettingItem icon="notifications" title={t('dailyCelestialPush')} type="switch" value={true} />
                <SettingItem icon="moon" title={t('rahuKalayaAlerts')} type="switch" value={true} />
                <SettingItem icon="location" title={t('syncHoroscopeLocation')} type="switch" value={false} />
              </AuraBox>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).duration(800)}>
              <AuraBox>
                <Text style={s.sectionTitle}>{t('about')}</Text>
                <SettingItem icon="star" title={t('rateCosmicAlignment')} />
                <SettingItem icon="document-text" title={t('sacredScrolls')} />
                <SettingItem icon="shield-checkmark" title={t('privacyPolicy')} />
              </AuraBox>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(700).duration(800)}>
              <TouchableOpacity style={s.signOutButton} onPress={function() {
                if (Platform.OS === 'web') {
                  if (window.confirm('Are you sure you want to sign out?')) {
                    signOut();
                  }
                } else {
                  Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign Out', style: 'destructive', onPress: signOut },
                  ]);
                }
              }}>
                <Ionicons name="log-out-outline" size={20} color="#f87171" />
                <Text style={s.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </CosmicBackground>
  );
}

var s = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 70 : 50 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 4, textShadowColor: 'rgba(56,189,248,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  subtitle: { fontSize: 16, color: '#7dd3fc', marginBottom: 30, letterSpacing: 0.5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#7dd3fc', marginTop: 16, fontSize: 16 },
  avatarContainer: { alignSelf: 'center', width: 100, height: 100, marginBottom: 16 },
  avatarOuterRing: { ...StyleSheet.absoluteFillObject, borderRadius: 50, opacity: 0.8 },
  avatarInner: { flex: 1, margin: 3, backgroundColor: '#0f172a', borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#38bdf8', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0f172a' },
  userName: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 4 },
  userConstellation: { fontSize: 14, color: '#7dd3fc', textAlign: 'center', marginBottom: 8, fontWeight: '500' },
  birthDataBadge: { fontSize: 12, color: '#c084fc', textAlign: 'center', marginBottom: 24, fontWeight: '500', backgroundColor: 'rgba(192,132,252,0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'center', overflow: 'hidden' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(56,189,248,0.1)' },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#c084fc', marginBottom: 4 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: 'rgba(56,189,248,0.15)', marginVertical: 4 },
  authHeader: { alignItems: 'center', marginBottom: 20 },
  authTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 8 },
  authSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(56,189,248,0.1)' },
  inputLabel: { fontSize: 12, color: '#7dd3fc', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  errorText: { color: '#f87171', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  authButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', overflow: 'hidden', marginTop: 4 },
  authButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  switchModeBtn: { alignItems: 'center', paddingVertical: 12 },
  switchModeText: { color: '#7dd3fc', fontSize: 14, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: 'rgba(255,255,255,0.3)', marginHorizontal: 16, fontSize: 12, fontWeight: '600' },
  guestButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(56,189,248,0.2)' },
  guestButtonText: { color: '#7dd3fc', fontSize: 15, fontWeight: '600', marginLeft: 8 },
  sectionTitle: { fontSize: 14, color: 'rgba(125, 211, 252, 0.7)', fontWeight: '700', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1.5 },
  sectionHint: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, lineHeight: 18 },
  saveButton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', overflow: 'hidden', marginTop: 4 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  langContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 4 },
  langBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, overflow: 'hidden' },
  langBtnActive: {},
  langText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 15 },
  langTextActive: { color: '#fff', fontWeight: '800' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(56,189,248,0.1)' },
  settingIconWrapper: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 12 },
  settingLeft: { flex: 1 },
  settingTitle: { fontSize: 15, color: '#f8fafc', fontWeight: '600' },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginBottom: 8 },
  signOutText: { color: '#f87171', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e1b4b', borderRadius: 24, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  cityItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  cityText: { fontSize: 16, color: '#e2e8f0', fontWeight: '500' },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: 46 },
});