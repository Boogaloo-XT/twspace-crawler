/**
 * Example usage of twspace-crawler as a library
 */

const { twspaceCrawler } = require('./dist/lib');

async function main() {
  try {
    console.log('🚀 Initializing TwspaceCrawler...');
    
    // Initialize with tokens
    twspaceCrawler.init({
      authToken: '16705918241bc746fb2dc26f6a94c8f5cbf780cd',
      csrfToken: 'fec244fdabefa5110900e27e238b392534a73ec2813174e1957c4ecba1ca622369647d60423369e701a41ed98f14bb5afee3b796412c782a9a3f2c6a1db366cd58a67408fe59ac9be75236d6eecbc51d'
    });

    // Check authentication status
    const authStatus = twspaceCrawler.getAuthStatus();
    console.log('🔐 Auth Status:', authStatus);

    if (!authStatus.hasAuthToken || !authStatus.hasCsrfToken) {
      console.error('❌ Missing authentication tokens');
      return;
    }

    // Test space URL
    const spaceUrl = 'https://x.com/i/spaces/1OyKAjPPAPbGb';
    console.log('📡 Starting download for:', spaceUrl);

    // Download by URL
    const result = await twspaceCrawler.downloadByUrl(spaceUrl);

    if (result.success) {
      console.log('✅ Download started successfully!');
      console.log('📁 Filename:', result.filename);
      if (result.filePath) {
        console.log('📍 File path:', result.filePath);
      }
    } else {
      console.error('❌ Download failed:', result.error);
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

// Run the example
main();
