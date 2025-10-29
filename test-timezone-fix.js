#!/usr/bin/env node

/**
 * Test script to demonstrate the timezone fix
 * Run this at any time of day to see the difference between UTC and local time
 */

console.log('='.repeat(60));
console.log('TIMEZONE FIX DEMONSTRATION');
console.log('='.repeat(60));
console.log();

const now = new Date();

console.log('Current System Time:');
console.log('  Local:', now.toLocaleString());
console.log('  UTC:  ', now.toUTCString());
console.log();

// OLD METHOD (BROKEN) - Uses UTC
function getDateStringOLD(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

// NEW METHOD (FIXED) - Uses Local Time
function getDateStringNEW(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('Date String Comparison:');
console.log('  OLD (UTC):   ', getDateStringOLD(now));
console.log('  NEW (Local): ', getDateStringNEW(now));
console.log();

// Check if they differ
if (getDateStringOLD(now) !== getDateStringNEW(now)) {
  console.log('⚠️  MISMATCH DETECTED!');
  console.log('   This happens when local time and UTC are on different days.');
  console.log('   The OLD method would show the wrong "Today" date.');
  console.log();
} else {
  console.log('✅ Both methods match (UTC and local are on the same day)');
  console.log('   The bug would appear near midnight in your timezone.');
  console.log();
}

// Show when the bug would occur
const localHour = now.getHours();
const utcHour = now.getUTCHours();
const hourDiff = (utcHour - localHour + 24) % 24;

console.log('Timezone Information:');
console.log('  Local Hour:', localHour);
console.log('  UTC Hour:  ', utcHour);
console.log('  Offset:    ', hourDiff, 'hours ahead of local');
console.log();

if (hourDiff > 0) {
  const bugStartHour = 24 - hourDiff;
  console.log(`💡 The bug would occur between ${bugStartHour}:00 and 23:59 local time`);
  console.log(`   (when UTC has already moved to the next day)`);
} else {
  console.log('💡 The bug would occur in the early morning hours');
  console.log('   (when UTC is still on the previous day)');
}

console.log();
console.log('='.repeat(60));
