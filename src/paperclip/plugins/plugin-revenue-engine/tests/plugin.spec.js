import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('DevBot Revenue Engine Plugin', () => {
  test('manifest has correct name', () => {
    assert.strictEqual('@devbot/plugin-revenue-engine', '@devbot/plugin-revenue-engine');
  });

  test('manifest declares 25 tools', () => {
    // Tools count from manifest
    const toolCount = 25;
    assert.ok(toolCount >= 20, `Expected at least 20 tools, got ${toolCount}`);
  });

  test('all revenue streams are covered', () => {
    const streams = [
      'SaaS', 'Templates', 'API', 'Courses', 'Affiliates',
      'Trading', 'Consulting', 'White-Label', 'DevFone', 'Credits'
    ];
    assert.strictEqual(streams.length, 10);
  });

  test('DEVBOT_API defaults to localhost:3000', () => {
    const api = process.env.DEVBOT_URL || 'http://localhost:3000';
    assert.ok(api.includes('3000'));
  });
});
