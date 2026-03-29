import { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const generateClassTimes = () => {
  const day       = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  return isWeekend
    ? ['10:00 AM - 11:00 AM', '2:00 PM - 3:00 PM', '7:00 PM - 8:00 PM']
    : ['3:30 PM - 4:30 PM', '6:00 PM - 7:00 PM', '8:00 PM - 9:00 PM'];
};

const useTimetable = ({ subjects }) => {
  const [timetableData, setTimetableData]     = useState([]);
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [tempTimetable, setTempTimetable]     = useState([]);
  const [showTimePicker, setShowTimePicker]   = useState(false);
  const [activeTimeIndex, setActiveTimeIndex] = useState(-1);
  const [activeTimeType, setActiveTimeType]   = useState('start');
  const [pickerDate, setPickerDate]           = useState(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        const saved      = await AsyncStorage.getItem('customTimetable');
        const classTimes = generateClassTimes();
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.length > 0) { setTimetableData(parsed); return; }
        }
        if (subjects?.length > 0) {
          setTimetableData(subjects.slice(0, 3).map((sub, i) => ({
            time: classTimes[i] || '00:00',
            subject: sub?.Subject || 'Free Period',
          })));
        } else {
          setTimetableData(classTimes.slice(0, 3).map(time => ({ time, subject: 'Free Period' })));
        }
      } catch {
        const classTimes = generateClassTimes();
        setTimetableData(classTimes.slice(0, 3).map(time => ({ time, subject: 'Free Period' })));
      }
    };
    load();
  }, [subjects]);

  const openTimetableEditor = () => {
    setTempTimetable(JSON.parse(JSON.stringify(timetableData)));
    setIsEditingTimetable(true);
  };

  const handleTimetableChange = (text, index) => {
    const next = [...tempTimetable];
    next[index].subject = text;
    setTempTimetable(next);
  };

  const saveTimetable = async () => {
    try {
      setTimetableData(tempTimetable);
      await AsyncStorage.setItem('customTimetable', JSON.stringify(tempTimetable));
      setIsEditingTimetable(false);
      Alert.alert('Success', 'Timetable updated!');
    } catch {
      Alert.alert('Error', 'Could not save timetable.');
    }
  };

  const resetTimetable = async () => {
    try {
      await AsyncStorage.removeItem('customTimetable');
      const classTimes = generateClassTimes();
      setTimetableData(subjects.slice(0, 3).map((sub, i) => ({
        time: classTimes[i],
        subject: sub.Subject,
      })));
      setIsEditingTimetable(false);
    } catch (e) { console.error(e); }
  };

  const openTimePicker = (index, fullTimeString, type) => {
    setActiveTimeIndex(index);
    setActiveTimeType(type);
    const parts      = fullTimeString.split(' - ');
    const timeToParse = type === 'start' ? parts[0] : (parts[1] || parts[0]);
    let date         = new Date();
    const timeParts  = timeToParse?.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeParts) {
      let hours = parseInt(timeParts[1]);
      const mins = parseInt(timeParts[2]);
      const ampm = timeParts[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      date.setHours(hours);
      date.setMinutes(mins);
    } else {
      date.setMinutes(0);
      date.setHours(type === 'start' ? 9 : 10);
    }
    setPickerDate(date);
    setShowTimePicker(true);
  };

  const onTimeChange = (event, selectedDate) => {
    if (event.type === 'dismissed') { setShowTimePicker(false); return; }
    const current = selectedDate || pickerDate;
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (activeTimeIndex > -1) {
      let h = current.getHours();
      const m    = current.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const mStr = m < 10 ? '0' + m : m;
      const newTime = `${h}:${mStr} ${ampm}`;
      const range   = tempTimetable[activeTimeIndex].time;
      const parts   = range.includes(' - ') ? range.split(' - ') : [range, '??'];
      const final   = activeTimeType === 'start'
        ? `${newTime} - ${parts[1] || '10:00 AM'}`
        : `${parts[0] || '9:00 AM'} - ${newTime}`;
      const next = [...tempTimetable];
      next[activeTimeIndex].time = final;
      setTempTimetable(next);
    }
  };

  return {
    timetableData, isEditingTimetable, setIsEditingTimetable,
    tempTimetable, showTimePicker, setShowTimePicker,
    pickerDate, openTimetableEditor, handleTimetableChange,
    saveTimetable, resetTimetable, openTimePicker, onTimeChange,
  };
};

export default useTimetable;
