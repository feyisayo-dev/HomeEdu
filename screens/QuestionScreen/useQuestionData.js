import { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * useQuestionData
 *
 * Handles all data fetching for the question screen:
 *  - fetchQuestions  (offline interceptor + online API)
 *  - fetchUserProfile
 *
 * Returns: { questions, setQuestions, loading, userStatus }
 */
const useQuestionData = ({
  userData,
  isOffline,
  type,
  subject,
  topic,
  subtopic,
  subtopicId,
  title,
  userClass,
  examId,
  selectedSubjects,
  offlineData,
  offlineQuestions,
}) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState('free');

  // ─── Fetch user profile ───────────────────────────────────────────────────
  const fetchUserProfile = async () => {
    if (isOffline) {
      setUserStatus(userData?.status || 'free');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('https://homeedu.fsdgroup.com.ng/api/user', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });
      const rawText = await response.text();
      if (rawText) {
        const json = JSON.parse(rawText);
        if (json.status === 200) setUserStatus(json.userData.status);
      }
    } catch (error) {
      setUserStatus(userData?.status || 'free');
    }
  };

  // ─── Fetch questions ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData) return;

    const fetchQuestions = async () => {
      try {
        let rawQuestions = [];

        // ── OFFLINE ──────────────────────────────────────────────────────────
        if (isOffline) {
          let extracted = [];

          if ((type === 'subtopicExam' || type === 'DistrictWork' || type === 'schoolWork') && offlineQuestions) {
            extracted = [...offlineQuestions];
          } else if (type === 'topicExam' && offlineData) {
            offlineData.forEach((sub) => {
              if (sub.questions) extracted = [...extracted, ...sub.questions];
            });
          } else if (type === 'subjectExam' && offlineData) {
            offlineData.forEach((top) => {
              if (top.subtopics) {
                top.subtopics.forEach((sub) => {
                  if (sub.questions) extracted = [...extracted, ...sub.questions];
                });
              }
            });
          }

          // Limits — school exams have no limit (teacher sets the count)
          let limit = null;
          if (type === 'subjectExam') limit = 40;
          if (type === 'topicExam') limit = 30;
          if (type === 'subtopicExam') limit = 20;

          extracted.sort(() => 0.5 - Math.random());
          rawQuestions = limit ? extracted.slice(0, limit) : extracted;
        }

        // ── ONLINE ───────────────────────────────────────────────────────────
        else {
          let payload = { class: userData.class };

          switch (type) {
            case 'JAMB':
              if (selectedSubjects.length > 0) {
                payload.JAMB_SUBJECT = selectedSubjects.join(',');
                payload.total_questions = null;
              }
              break;
            case 'classExam':
              payload.subject = subject;
              payload.total_questions = 60;
              break;
            case 'subjectExam':
              payload.subject = subject;
              payload.topic = topic;
              payload.total_questions = 40;
              break;
            case 'topicExam':
              payload.subject = subject;
              payload.topic = topic;
              payload.subtopic = subtopic;
              payload.total_questions = 30;
              break;
            case 'subtopicExam':
              payload.subject = subject;
              payload.topic = topic;
              payload.subtopic = subtopic;
              payload.total_questions = 20;
              break;
            case 'schoolWork':
            case 'DistrictWork':
              payload.subject = 'School Work';
              payload.topic = subject;
              payload.subtopic = title;
              payload.class = userClass;
              payload.subtopicId = subtopicId;
              payload.total_questions = null;
              break;
            default:
              payload.total_questions = 10;
          }

          const token = await AsyncStorage.getItem('token');
          const cleanToken = token ? token.replace(/"/g, '') : '';

          const response = await axios.post(
            'https://homeedu.fsdgroup.com.ng/api/ExamQuestions',
            payload,
            {
              headers: {
                Authorization: `Bearer ${cleanToken}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            }
          );
          rawQuestions = response.data.data || [];
        }

        // ── SHARED PARSING ───────────────────────────────────────────────────

        // 🖼️ OFFLINE IMAGE REPLACER
        // Swap all remote image URLs in the question data with local file paths
        // so images still display when there is no internet connection.
       // 🖼️ OFFLINE IMAGE REPLACER (Direct Object Swapping)
        let questionsToParse = rawQuestions;
        
        if (isOffline) {
          try {
            const offlineImageDir = FileSystem.documentDirectory + 'offline_images/';
            let swapCount = 0;
            let swappedDetails = [];

            const swapImagesInObject = (obj) => {
              if (!obj) return obj;
              
              if (Array.isArray(obj)) {
                return obj.map(item => swapImagesInObject(item));
              } else if (typeof obj === 'object') {
                const newObj = { ...obj };
                
                // 1. Swap the direct database "image" key
                if (newObj.image && typeof newObj.image === 'string' && newObj.image.startsWith('http')) {
                  swapCount++;
                  const url = newObj.image;
                  
                  // 🛑 THE FILENAME FIX: Make it a flat, safe string!
                  const safeFilename = url.replace(/[^a-zA-Z0-9.]/g, '_'); 
                  const localUri = offlineImageDir + safeFilename;
                  
                  swappedDetails.push({ original: url, local: localUri });
                  newObj.image = localUri;
                }
                
                // 2. Swap images hiding inside HTML content
                if (newObj.content && typeof newObj.content === 'string') {
                  newObj.content = newObj.content.replace(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi, (match, url) => {
                    swapCount++;
                    
                    // 🛑 THE FILENAME FIX: Make it a flat, safe string!
                    const safeFilename = url.replace(/[^a-zA-Z0-9.]/g, '_'); 
                    const localUri = offlineImageDir + safeFilename;
                    
                    swappedDetails.push({ original: url, local: localUri });
                    return match.replace(url, localUri);
                  });
                }
                
                // 3. Keep digging deeper (for options, passages, etc)
                for (const key in newObj) {
                  if (typeof newObj[key] === 'object' && newObj[key] !== null) {
                     newObj[key] = swapImagesInObject(newObj[key]);
                  }
                }
                return newObj;
              }
              return obj;
            };

            // Execute the swapper
            questionsToParse = swapImagesInObject(rawQuestions);

            if (swapCount > 0) {
              console.log(`🖼️ [OFFLINE IMAGES] Successfully swapped ${swapCount} image(s)!`);
              console.log(JSON.stringify(swappedDetails, null, 2));
            } else {
              console.log(`🖼️ [OFFLINE IMAGES] No images to swap in this exam.`);
            }
          } catch (e) {
            console.log('Could not swap offline images:', e);
            questionsToParse = rawQuestions; // Fallback to raw if something fails
          }
        }
        const parsedQuestions = questionsToParse.map((q) => {
          let parsedOptions = null;
          if (q.options) {
            if (typeof q.options === 'object') {
              parsedOptions = q.options;
            } else {
              try {
                parsedOptions = JSON.parse(q.options);
              } catch {
                parsedOptions = [];
              }
            }
          }
          return { ...q, options: parsedOptions };
        });

        const validQuestions = parsedQuestions.filter(
          (q) =>
            q.options &&
            ((Array.isArray(q.options) && q.options.length > 0) ||
              Object.keys(q.options).length > 0)
        );

        setQuestions(validQuestions);
      } catch (error) {
        console.error('❌ Error fetching questions:', error);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
    fetchUserProfile();
  }, [userData, isOffline]);

  return { questions, setQuestions, loading, userStatus };
};

export default useQuestionData;