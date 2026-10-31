import {afterEach, describe, expect, it} from '@jest/globals';
import {apiBaseUrl} from '../src/config/app-config';

const KEY = 'RN_API_BASE_URL';

describe('apiBaseUrl', () => {
  afterEach(() => {
    delete process.env[KEY];
  });

  it('returns the configured base url', () => {
    process.env[KEY] = 'http://localhost:5104';
    expect(apiBaseUrl()).toBe('http://localhost:5104');
  });

  it('throws when RN_API_BASE_URL is missing（fail-fast，禁默认值兜底）', () => {
    delete process.env[KEY];
    expect(() => apiBaseUrl()).toThrow(/RN_API_BASE_URL/);
  });
});
