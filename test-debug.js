const credentials = require('./src/utils/credentials.js');

console.log('=== DEBUG TEST ===');
console.log('Available functions:', Object.keys(credentials));
console.log('createSafeCredentials type:', typeof credentials.createSafeCredentials);
console.log('logCredentialStatus type:', typeof credentials.logCredentialStatus);

if (credentials.createSafeCredentials) {
  console.log('createSafeCredentials works!');
} else {
  console.log('createSafeCredentials is missing');
}

if (credentials.logCredentialStatus) {
  console.log('logCredentialStatus works!');
} else {
  console.log('logCredentialStatus is missing');
} 