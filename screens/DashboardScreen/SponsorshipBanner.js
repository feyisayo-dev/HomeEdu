import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sponsorBannerStyles as s } from './dashboardStyles';

const SponsorshipBanner = ({ sponsorship }) => {
  if (!sponsorship?.is_sponsored) return null;
  const { politician, days_remaining, expires_at_formatted } = sponsorship;
  const expiringSoon = days_remaining <= 7;

  return (
    <View style={s.container}>
      {politician.image && <Image source={{ uri: politician.image }} style={s.photo} />}
      <View style={s.content}>
        <View style={s.header}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={s.badge}>SPONSORED STUDENT</Text>
        </View>
        <Text style={s.sponsorText}>
          Sponsored by <Text style={s.politicianName}>{politician.name}</Text>
        </Text>
        <Text style={s.position}>{politician.position} • {politician.constituency}</Text>
        <View style={[s.expiryContainer, expiringSoon && s.expiryWarning]}>
          <Ionicons name={expiringSoon ? 'alert-circle' : 'calendar'} size={14} color={expiringSoon ? '#DC2626' : '#6B7280'} />
          <Text style={[s.expiryText, expiringSoon && s.expiryTextWarning]}>
            {days_remaining} days remaining • Expires {expires_at_formatted}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default SponsorshipBanner;
