import { CacheService } from '../src/lib/cache';

async function runTests() {
  console.log('Starting CacheService tests...\n');

  try {
    // 1. Test set and get
    console.log('Test 1: set & get');
    const testData = { id: 1, name: 'Test Category' };
    await CacheService.set('test:key:1', testData, 60);
    const retrievedData = await CacheService.get<typeof testData>('test:key:1');
    console.log('Retrieved Data:', retrievedData);
    if (retrievedData?.name === 'Test Category') {
      console.log('✅ Test 1 Passed\n');
    } else {
      console.error('❌ Test 1 Failed\n');
    }

    // 2. Test del
    console.log('Test 2: del');
    await CacheService.del('test:key:1');
    const nullData = await CacheService.get('test:key:1');
    if (nullData === null) {
      console.log('✅ Test 2 Passed\n');
    } else {
      console.error('❌ Test 2 Failed\n');
    }

    // 3. Test invalidatePattern
    console.log('Test 3: invalidatePattern');
    await CacheService.set('products:list:1', { page: 1 }, 60);
    await CacheService.set('products:list:2', { page: 2 }, 60);
    await CacheService.set('products:detail:1', { id: 1 }, 60);

    await CacheService.invalidatePattern('products:list:*');

    const p1 = await CacheService.get('products:list:1');
    const p2 = await CacheService.get('products:list:2');
    const d1 = await CacheService.get('products:detail:1'); // Should still exist

    if (p1 === null && p2 === null && d1 !== null) {
      console.log('✅ Test 3 Passed\n');
    } else {
      console.error('❌ Test 3 Failed');
      console.error('p1:', p1, 'p2:', p2, 'd1:', d1);
    }

  } catch (error) {
    console.error('Test execution error:', error);
  }

  process.exit(0);
}

runTests();
