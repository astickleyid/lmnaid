#!/usr/bin/env node
const net = require('net');
const fs = require('fs');
const path = require('path');

async function checkPort(port, name) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.connect(port, '127.0.0.1', () => {
      console.log(`✅ ${name} (${port}): OPEN`);
      client.destroy();
      resolve(true);
    });
    client.on('error', () => {
      console.log(`❌ ${name} (${port}): CLOSED`);
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('🧪 nXcor Streaming Verification\n');
  console.log('='.repeat(40));
  
  const rtmpOk = await checkPort(1935, 'RTMP');
  const httpOk = await checkPort(8000, 'HTTP');
  
  console.log('\n🌐 API Health:');
  try {
    const health = await fetch('http://localhost:3001/api/health').then(r => r.json());
    console.log(`   WebRTC: ${health.services.webrtc ? '✅' : '❌'}`);
    console.log(`   Internal: ${health.services.internal ? '✅' : '❌'}`);
    console.log(`   RTMP: ${health.services.rtmp ? '✅' : '❌'}`);
  } catch (e) {
    console.log('❌ Backend not responding');
  }
  
  console.log('\n' + '='.repeat(40));
  if (rtmpOk && httpOk) {
    console.log('✅ STREAMING VERIFIED: All services running');
    process.exit(0);
  } else {
    console.log('❌ STREAMING FAILED');
    process.exit(1);
  }
}

runTests();
