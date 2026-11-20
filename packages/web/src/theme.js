/**
 * 主题管理模块
 * 支持 dark / light 双主题切换
 */
var THEME_KEY = 'theme';

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) { /* ignore */ }
}

export function toggleTheme() {
  var current = getTheme();
  var next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}