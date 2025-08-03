#!/usr/bin/env node

const pumpStateTracker = require('../src/services/pumpStateTracker');

async function testPumpTracking() {
  console.log('🧪 Testing Pump State Tracking...');
  
  // Test 1: Initial state
  console.log('\n📋 Test 1: Initial state');
  const initialState = pumpStateTracker.getCurrentState();
  console.log('Initial state:', initialState);
  
  // Test 2: First pump status (should set initial state)
  console.log('\n📋 Test 2: First pump status (ON)');
  const timestamp1 = new Date().toISOString();
  const changed1 = await pumpStateTracker.checkStateChange(true, timestamp1);
  console.log('State changed:', changed1);
  console.log('Current state:', pumpStateTracker.getCurrentState());
  
  // Test 3: Same status (should not trigger change)
  console.log('\n📋 Test 3: Same status (ON)');
  const timestamp2 = new Date().toISOString();
  const changed2 = await pumpStateTracker.checkStateChange(true, timestamp2);
  console.log('State changed:', changed2);
  console.log('Current state:', pumpStateTracker.getCurrentState());
  
  // Test 4: Status change (should trigger annotation)
  console.log('\n📋 Test 4: Status change (ON → OFF)');
  const timestamp3 = new Date().toISOString();
  const changed3 = await pumpStateTracker.checkStateChange(false, timestamp3);
  console.log('State changed:', changed3);
  console.log('Current state:', pumpStateTracker.getCurrentState());
  
  // Test 5: Another status change (should trigger annotation)
  console.log('\n📋 Test 5: Status change (OFF → ON)');
  const timestamp4 = new Date().toISOString();
  const changed4 = await pumpStateTracker.checkStateChange(true, timestamp4);
  console.log('State changed:', changed4);
  console.log('Current state:', pumpStateTracker.getCurrentState());
  
  console.log('\n✅ Pump state tracking test completed');
}

testPumpTracking().catch(console.error); 