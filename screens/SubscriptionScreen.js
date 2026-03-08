import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, SafeAreaView, ScrollView, Image, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const SubscriptionScreen = ({ navigation }) => {
  const SIGNUP_URL = "https://www.homeedu.com.ng/signup.html";
  const [sponsorship, setSponsorship] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSponsorshipData();
  }, []);

  const loadSponsorshipData = async () => {
    try {
      const sponsorshipData = await AsyncStorage.getItem('sponsorship');
      if (sponsorshipData) {
        const parsed = JSON.parse(sponsorshipData);
        if (parsed && parsed.is_sponsored) {
          setSponsorship(parsed);
        }
      }
    } catch (error) {
      console.log('Error loading sponsorship data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openWebsite = () => {
    Linking.openURL(SIGNUP_URL);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#864AF9" />
      </View>
    );
  }

  // 🎯 SPONSORED STUDENT VIEW
  if (sponsorship && sponsorship.is_sponsored) {
    const { politician, expires_at_formatted, days_remaining } = sponsorship;
    const isExpiringSoon = days_remaining <= 7;

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.sponsoredContainer}>
          
          {/* Success Icon */}
          <View style={styles.successIcon}>
            <Ionicons name="trophy" size={60} color="#FFD700" />
          </View>

          <Text style={styles.sponsoredTitle}>🎓 You're Sponsored!</Text>
          
          {/* Politician Section */}
          <View style={styles.politicianCard}>
            {politician.image && (
              <Image
                source={{ uri: politician.image }}
                style={styles.politicianPhotoLarge}
              />
            )}

            <Text style={styles.sponsoredBy}>Your education is sponsored by</Text>
            <Text style={styles.politicianNameLarge}>{politician.name}</Text>
            <Text style={styles.politicianPosition}>{politician.position}</Text>
            <Text style={styles.politicianConstituency}>{politician.constituency}</Text>

            {/* Badge */}
            <View style={styles.sponsorBadge}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <Text style={styles.badgeText}>Government Sponsored Student</Text>
            </View>
          </View>

          {/* Subscription Details Card */}
          <View style={[
            styles.detailsCard,
            isExpiringSoon && styles.detailsCardWarning
          ]}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#864AF9" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Sponsorship Expires</Text>
                <Text style={styles.detailValue}>{expires_at_formatted}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons 
                name={isExpiringSoon ? "alert-circle" : "time-outline"} 
                size={20} 
                color={isExpiringSoon ? "#DC2626" : "#864AF9"} 
              />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Days Remaining</Text>
                <Text style={[
                  styles.detailValue,
                  isExpiringSoon && styles.warningText
                ]}>
                  {days_remaining} days
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { color: '#10B981' }]}>Active</Text>
              </View>
            </View>
          </View>

          {/* Warning for expiring soon */}
          {isExpiringSoon && (
            <View style={styles.warningCard}>
              <Ionicons name="warning" size={24} color="#F59E0B" />
              <Text style={styles.warningText}>
                Your sponsorship is expiring soon! Please contact {politician.name} for renewal.
              </Text>
            </View>
          )}

          {/* Motivational Message */}
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>💪 Make Them Proud!</Text>
            <Text style={styles.messageText}>
              You've been given an incredible opportunity. Study hard, excel in your exams, and make {politician.name} proud of their investment in your future!
            </Text>
          </View>

          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backBtnText}>BACK TO DASHBOARD</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // 🎯 REGULAR STUDENT VIEW (Not Sponsored)
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Header Section */}
        <View style={styles.headerBox}>
          <Text style={styles.headerIcon}>🚀</Text>
          <Text style={styles.headerTitle}>UNLOCK PREMIUM</Text>
          <Text style={styles.headerSub}>Take your exam prep to the next level.</Text>
        </View>

        {/* Steps Section */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>HOW TO UPGRADE:</Text>
          
          <View style={styles.stepRow}>
            <View style={styles.stepNumberBox}><Text style={styles.stepNumber}>1</Text></View>
            <Text style={styles.stepText}>Tap the button below to visit our secure website.</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumberBox}><Text style={styles.stepNumber}>2</Text></View>
            <Text style={styles.stepText}>Sign in with your exact HomeEdu account details.</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumberBox}><Text style={styles.stepNumber}>3</Text></View>
            <Text style={styles.stepText}>Choose your Class Plan and complete the payment.</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumberBox}><Text style={styles.stepNumber}>4</Text></View>
            <Text style={styles.stepText}>Come back to the app, pull to refresh, and start dominating your exams!</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.primaryBtn} onPress={openWebsite}>
          <Text style={styles.primaryBtnText}>🌐 GO TO WEBSITE TO PAY</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryBtnText}>🔙 BACK TO APP</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FE',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  sponsoredContainer: {
    padding: 20,
    alignItems: 'center',
  },
  
  // Sponsored Student Styles
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  sponsoredTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F2937',
    marginBottom: 30,
  },
  politicianCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#864AF9',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  politicianPhotoLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: '#864AF9',
    marginBottom: 20,
  },
  sponsoredBy: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  politicianNameLarge: {
    fontSize: 24,
    fontWeight: '900',
    color: '#864AF9',
    textAlign: 'center',
    marginBottom: 5,
  },
  politicianPosition: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 3,
  },
  politicianConstituency: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  sponsorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    marginLeft: 10,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    marginBottom: 20,
  },
  detailsCardWarning: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    marginBottom: 20,
  },
  warningText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  messageCard: {
    backgroundColor: '#F0F4FF',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    marginBottom: 20,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#864AF9',
    marginBottom: 10,
  },
  messageText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  backBtn: {
    flexDirection: 'row',
    backgroundColor: '#864AF9',
    borderWidth: 3,
    borderColor: '#000000',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 10,
  },

  // Regular Student Styles (existing)
  headerBox: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  headerIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '600',
    marginTop: 5,
  },
  stepsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
    marginBottom: 30,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  stepNumberBox: {
    backgroundColor: '#FBBF24',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    marginTop: 2,
  },
  stepNumber: {
    fontWeight: '900',
    color: '#000000',
    fontSize: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    lineHeight: 22,
  },
  primaryBtn: {
    backgroundColor: '#864AF9',
    borderWidth: 3,
    borderColor: '#000000',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#000000',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default SubscriptionScreen;