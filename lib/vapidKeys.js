// Simple VAPID key generator that works in browser console
// Copy and paste this into your browser console to generate keys

function generateVapidKeys() {
  // Generate random bytes for keys
  function generateRandomBytes(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
  }
  
  // Convert bytes to base64url
  function bytesToBase64url(bytes) {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  
  // Generate keys
  const publicKey = bytesToBase64url(generateRandomBytes(65));
  const privateKey = bytesToBase64url(generateRandomBytes(32));
  
  console.log('VAPID Keys Generated:');
  console.log('');
  console.log('Public Key:');
  console.log(publicKey);
  console.log('');
  console.log('Private Key:');
  console.log(privateKey);
  console.log('');
  console.log('Add these to your .env file:');
  console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
  
  return { publicKey, privateKey };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  generateVapidKeys();
} else {
  // Export for Node.js
  module.exports = { generateVapidKeys };
}
