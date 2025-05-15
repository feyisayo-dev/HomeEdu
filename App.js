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
import JambScreen from './screens/JambScreen';


const Stack = createStackNavigator();

export default function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="Subject" component={SubjectScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="Topic" component={TopicScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="Explanation" component={ExplanationScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="Example" component={ExampleScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="Subtopic" component={SubtopicScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="Question" component={QuestionScreen} options={{
            headerShown: false
          }} />
          <Stack.Screen name="JAMB" component={JambScreen} options={{
            headerShown: false
          }} />
        </Stack.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}
