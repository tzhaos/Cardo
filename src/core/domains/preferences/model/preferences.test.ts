import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getAlternateAppTheme,
  getAlternateLocale,
  detectPreferredLocale,
  DEFAULT_APP_THEME,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_LOCALE,
  DEFAULT_PREFERENCES,
  resolveFontFamily,
  resolveFontSize,
} from './preferences';

test('getAlternateAppTheme toggles between dark and light', () => {
  assert.equal(getAlternateAppTheme('dark'), 'light');
  assert.equal(getAlternateAppTheme('light'), 'dark');
});

test('getAlternateLocale toggles between zh and en', () => {
  assert.equal(getAlternateLocale('zh'), 'en');
  assert.equal(getAlternateLocale('en'), 'zh');
});

test('detectPreferredLocale returns zh for Chinese language codes', () => {
  assert.equal(detectPreferredLocale('zh'), 'zh');
  assert.equal(detectPreferredLocale('zh-CN'), 'zh');
  assert.equal(detectPreferredLocale('zh-TW'), 'zh');
  assert.equal(detectPreferredLocale('zh-Hans'), 'zh');
});

test('detectPreferredLocale returns default for non-Chinese languages', () => {
  assert.equal(detectPreferredLocale('en'), DEFAULT_LOCALE);
  assert.equal(detectPreferredLocale('en-US'), DEFAULT_LOCALE);
  assert.equal(detectPreferredLocale('ja'), DEFAULT_LOCALE);
  assert.equal(detectPreferredLocale('fr'), DEFAULT_LOCALE);
});

test('detectPreferredLocale returns default for null or empty input', () => {
  assert.equal(detectPreferredLocale(null), DEFAULT_LOCALE);
  assert.equal(detectPreferredLocale(undefined), DEFAULT_LOCALE);
  assert.equal(detectPreferredLocale(''), DEFAULT_LOCALE);
});

test('DEFAULT_PREFERENCES uses expected defaults', () => {
  assert.equal(DEFAULT_PREFERENCES.theme, DEFAULT_APP_THEME);
  assert.equal(DEFAULT_PREFERENCES.locale, DEFAULT_LOCALE);
  assert.equal(DEFAULT_PREFERENCES.fontFamily, DEFAULT_FONT_FAMILY);
  assert.equal(DEFAULT_PREFERENCES.fontSize, DEFAULT_FONT_SIZE);
});

test('resolveFontFamily returns configured stacks', () => {
  assert.match(resolveFontFamily('system'), /font-sans/);
  assert.match(resolveFontFamily('segoe'), /Segoe UI/);
  assert.match(resolveFontFamily('noto'), /Noto Sans SC/);
});

test('resolveFontSize returns px values', () => {
  assert.equal(resolveFontSize('13'), '13px');
  assert.equal(resolveFontSize('16'), '16px');
});
