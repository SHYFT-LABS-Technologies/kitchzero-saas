const crypto = require('crypto')

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex')
}

console.log('🔐 Generated Secure Secrets for KitchZero:')
console.log('')
console.log('# Copy these to your .env.local file')
console.log('JWT_SECRET=' + generateSecret(32))
console.log('JWT_REFRESH_SECRET=' + generateSecret(32))  
console.log('ENCRYPTION_KEY=' + generateSecret(32))
console.log('')
console.log('⚠️  SECURITY NOTICE:')
console.log('1. Never commit these secrets to version control')
console.log('2. Use different secrets for each environment')
console.log('3. Store production secrets securely')