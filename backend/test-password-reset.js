const emailService = require('./utils/emailService');

async function testPasswordReset() {
  try {
    console.log('🧪 Testing password reset functionality...\n');
    
    // Generate a test token
    const testToken = 'test-token-' + Date.now();
    const testEmail = 'test@example.com';
    const testName = 'Test User';
    
  console.log('📧 Triggering email service...');
  console.log('Provider:', process.env.EMAIL_PROVIDER || '(auto)');
    
    // Test the email service directly
    const result = await emailService.sendPasswordReset(testEmail, testToken, testName);
    
    console.log('✅ Email service test completed:', result);
    if (result?.preview) {
      console.log('🔗 Ethereal preview URL:', result.preview);
    }
    
    // Check if file was created
    const fs = require('fs');
    const path = require('path');
    const resetUrlFile = path.join(__dirname, 'logs/password-reset-urls.txt');
    
    if (fs.existsSync(resetUrlFile)) {
      console.log('\n📁 Reset URLs file exists. Contents:');
      const content = fs.readFileSync(resetUrlFile, 'utf8');
      console.log(content);
    } else {
      console.log('\n❌ Reset URLs file was not created');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPasswordReset();