/**
 * 国际化管理模块
 * 提供 t() 翻译函数、语言切换、变更监听
 */
import { translations } from './translations.js';

var LANG_KEY = 'lang';
var _lang = 'zh';
var _listeners = [];

function _getBrowserLang() {
  var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  if (navLang.startsWith('zh')) return 'zh';
  return 'en';
}

function _getUrlLang() {
  var params = new URLSearchParams(window.location.search);
  var lang = params.get('lang');
  if (lang === 'zh' || lang === 'en') return lang;
  return null;
}

export function initI18n() {
  var urlLang = _getUrlLang();
  if (urlLang) {
    _lang = urlLang;
    try { localStorage.setItem(LANG_KEY, _lang); } catch (e) { /* ignore */ }
  } else {
    try {
      _lang = localStorage.getItem(LANG_KEY) || _getBrowserLang();
    } catch (e) {
      _lang = _getBrowserLang();
    }
  }
  if (_lang !== 'zh' && _lang !== 'en') _lang = 'zh';
  document.documentElement.lang = _lang === 'zh' ? 'zh-CN' : 'en';
  return _lang;
}

export function getLang() {
  return _lang;
}

export function setLang(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  if (_lang === lang) return;
  _lang = lang;
  document.documentElement.lang = _lang === 'zh' ? 'zh-CN' : 'en';
  try {
    localStorage.setItem(LANG_KEY, _lang);
  } catch (e) { /* ignore */ }
  _listeners.forEach(function (fn) { fn(_lang); });
}

export function t(key) {
  var dict = translations[_lang] || translations.zh;
  return dict[key] !== undefined ? dict[key] : key;
}

export function onLangChange(fn) {
  _listeners.push(fn);
}