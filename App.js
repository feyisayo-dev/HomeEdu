import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { UserProvider } from './context/UserContext';
import QuestionScreen from './screens/QuestionScreen';
import DashboardScreen from './screens/DashboardScreen';
import SubjectScreen from './screens/SubjectScreen';
import TopicScreen from './screens/TopicScreen';
import SubtopicScreen from './screens/SubtopicScreen';
import 'react-native-gesture-handler';
import ExplanationScreen from './screens/ExplanationScreen';
import ExampleScreen from './screens/ExampleScreen';


const Stack = createStackNavigator();

export default function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Subject" component={SubjectScreen} />
          <Stack.Screen name="Topic" component={TopicScreen} />
          <Stack.Screen name="Explanation" component={ExplanationScreen} />
          <Stack.Screen name="Example" component={ExampleScreen} />
          <Stack.Screen name="Subtopic" component={SubtopicScreen} />
          <Stack.Screen name="Question" component={QuestionScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}
