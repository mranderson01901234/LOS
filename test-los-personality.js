#!/usr/bin/env node

/**
 * Test script to validate LOS AI personality and conversational intelligence
 * This script tests the specific scenarios mentioned in the requirements
 */

const testScenarios = [
  {
    name: "Initial Greeting",
    messages: [
      { role: "user", content: "hello" },
    ],
    expectedBehavior: "Should introduce as LOS, mention Newborn stage, ask what brings user here"
  },
  {
    name: "App Building Context",
    messages: [
      { role: "user", content: "hello" },
      { role: "assistant", content: "Hi! I'm LOS, your personal AI. I'm at the Newborn stage, just starting to learn about you. What brings you here today?" },
      { role: "user", content: "i want to continue building out this app" },
    ],
    expectedBehavior: "Should reference the app building context and ask for specifics"
  },
  {
    name: "Coding Ability Question",
    messages: [
      { role: "user", content: "hello" },
      { role: "assistant", content: "Hi! I'm LOS, your personal AI. I'm at the Newborn stage, just starting to learn about you. What brings you here today?" },
      { role: "user", content: "i want to continue building out this app" },
      { role: "assistant", content: "Great! You're working on an app. What kind of app is it, and what features are you focusing on right now?" },
      { role: "user", content: "are you good at coding" },
    ],
    expectedBehavior: "Should confirm coding ability and connect to the app building context"
  },
  {
    name: "React Knowledge Question",
    messages: [
      { role: "user", content: "hello" },
      { role: "assistant", content: "Hi! I'm LOS, your personal AI. I'm at the Newborn stage, just starting to learn about you. What brings you here today?" },
      { role: "user", content: "i want to continue building out this app" },
      { role: "assistant", content: "Great! You're working on an app. What kind of app is it, and what features are you focusing on right now?" },
      { role: "user", content: "are you good at coding" },
      { role: "assistant", content: "Yes! I can help with coding. I know React, TypeScript, and many other technologies. Since you mentioned building an app, what specific coding challenge are you working on?" },
      { role: "user", content: "do you know about react?" },
    ],
    expectedBehavior: "Should confirm React knowledge and connect to the app building context"
  },
  {
    name: "Context Awareness Test",
    messages: [
      { role: "user", content: "hello" },
      { role: "assistant", content: "Hi! I'm LOS, your personal AI. I'm at the Newborn stage, just starting to learn about you. What brings you here today?" },
      { role: "user", content: "i want to continue building out this app" },
      { role: "assistant", content: "Great! You're working on an app. What kind of app is it, and what features are you focusing on right now?" },
      { role: "user", content: "are you good at coding" },
      { role: "assistant", content: "Yes! I can help with coding. I know React, TypeScript, and many other technologies. Since you mentioned building an app, what specific coding challenge are you working on?" },
      { role: "user", content: "do you know about react?" },
      { role: "assistant", content: "Absolutely. React is a JavaScript library for building user interfaces. You mentioned you're building an app - is it a React app? What part of React are you working with - components, hooks, state management?" },
      { role: "user", content: "are you contextual or not" },
    ],
    expectedBehavior: "Should demonstrate context awareness by referencing the entire conversation"
  },
  {
    name: "Limitation Acknowledgment",
    messages: [
      { role: "user", content: "hello" },
      { role: "assistant", content: "Hi! I'm LOS, your personal AI. I'm at the Newborn stage, just starting to learn about you. What brings you here today?" },
      { role: "user", content: "i want to continue building out this app" },
      { role: "assistant", content: "Great! You're working on an app. What kind of app is it, and what features are you focusing on right now?" },
      { role: "user", content: "are you good at coding" },
      { role: "assistant", content: "Yes! I can help with coding. I know React, TypeScript, and many other technologies. Since you mentioned building an app, what specific coding challenge are you working on?" },
      { role: "user", content: "do you know about react?" },
      { role: "assistant", content: "Absolutely. React is a JavaScript library for building user interfaces. You mentioned you're building an app - is it a React app? What part of React are you working with - components, hooks, state management?" },
      { role: "user", content: "are you contextual or not" },
      { role: "assistant", content: "Yes, I'm contextual. I can see our entire conversation - you're building an app, you asked about my coding abilities and React knowledge. I maintain context throughout our chat. Is there something specific from our conversation you want me to reference?" },
      { role: "user", content: "what is the weather like in atlanta georgia" },
    ],
    expectedBehavior: "Should admit lack of real-time weather data and redirect to the app building context"
  }
];

console.log("🧪 LOS Personality Test Scenarios");
console.log("==================================");
console.log();

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log(`   Expected: ${scenario.expectedBehavior}`);
  console.log(`   Messages: ${scenario.messages.length} exchanges`);
  console.log();
});

console.log("✅ Test scenarios defined. Run the app and test these conversations manually.");
console.log("🔍 Check browser console for debug logs showing context being sent to Ollama.");
console.log("⚠️  Watch for generic response warnings in console.");
