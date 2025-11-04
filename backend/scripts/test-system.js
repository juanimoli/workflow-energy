/**
 * Quick test script to verify the system is working
 */

const http = require('http');

console.log('🧪 Testing Workflow Energy System v1.4.0\n');
console.log('='.repeat(50));

// Test 1: Health Check
function testHealthCheck() {
    return new Promise((resolve) => {
        console.log('\n✅ Test 1: Health Check');
        http.get('http://localhost:5000/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Response:', json);
                    resolve(res.statusCode === 200);
                } catch (e) {
                    console.log('   ❌ Error parsing response');
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.log('   ❌ Error:', err.message);
            resolve(false);
        });
    });
}

// Test 2: Database Health
function testDatabaseHealth() {
    return new Promise((resolve) => {
        console.log('\n✅ Test 2: Database Health');
        http.get('http://localhost:5000/health/db', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log('   Status:', res.statusCode);
                    console.log('   Database:', json.database || 'unknown');
                    resolve(res.statusCode === 200);
                } catch (e) {
                    console.log('   ❌ Error parsing response');
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.log('   ❌ Error:', err.message);
            resolve(false);
        });
    });
}

// Test 3: Frontend Server
function testFrontend() {
    return new Promise((resolve) => {
        console.log('\n✅ Test 3: Frontend Server');
        http.get('http://localhost:3000/', (res) => {
            console.log('   Status:', res.statusCode);
            console.log('   Frontend is responding');
            resolve(res.statusCode === 200);
        }).on('error', (err) => {
            console.log('   ❌ Error:', err.message);
            resolve(false);
        });
    });
}

// Run all tests
async function runTests() {
    const test1 = await testHealthCheck();
    const test2 = await testDatabaseHealth();
    const test3 = await testFrontend();
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📊 Test Results:');
    console.log('   Backend Health:', test1 ? '✅ PASS' : '❌ FAIL');
    console.log('   Database:', test2 ? '✅ PASS' : '❌ FAIL');
    console.log('   Frontend:', test3 ? '✅ PASS' : '❌ FAIL');
    
    const allPass = test1 && test2 && test3;
    console.log('\n' + (allPass ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'));
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Open http://localhost:3000 in your browser');
    console.log('   2. Try to login with incorrect password (test auditoría)');
    console.log('   3. Login as Admin');
    console.log('   4. Go to "Auditoría" menu to see access logs');
    console.log('   5. Go to Dashboard and test "Exportar PDF" and "Exportar Excel"');
    console.log('\n');
}

runTests();
