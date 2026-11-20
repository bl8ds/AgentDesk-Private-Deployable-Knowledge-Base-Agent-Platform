/**
 * 导航组件 - Linear Style
 * 管理顶部导航菜单，支持桌面端和移动端汉堡菜单
 * 集成主题切换和语言切换
 */
import { toggleTheme, getTheme } from '../theme.js';
import { t, getLang, setLang, onLangChange } from '../i18n/index.js';


export class Navigation {
  /**
   * @param {HTMLElement} container - 挂载容器
   * @param {Array<{id: string, label: string, i18nKey?: string}>} items - 导航项列表
   * @param {(id: string) => void} onNavigate - 导航切换回调函数
   */
  constructor(container, items, onNavigate) {
    this.container = container;
    this.items = items;
    this.onNavigate = onNavigate;
    this.activeId = items[0]?.id || '';
    this.isMobileMenuOpen = false;

    this._render();
    this._bindEvents();

    var self = this;
    onLangChange(function () {
      self._render();
      self._bindEvents();
      self.setActive(self.activeId);
    });
  }

  _render() {
    var self = this;
    this.container.innerHTML = [
      '<header class="app-header">',
      '<div class="header-inner">',
      '<div class="brand">',
      '<svg class="brand-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18,2 L9,16 H15 L12,29 L24,13 H17 L20,2 Z" fill="currentColor"/></svg>',
      '<span class="brand-title">' + t('brand.title') + '</span>',
      '</div>',
      '<nav class="nav-menu" role="navigation" aria-label="' + t('nav.menu') + '">',
      this.items
        .map(function (item) {
          var isActive = item.id === self.activeId;
          var label = t(item.i18nKey) || item.label;
          return (
            '<div class="nav-item">' +
            '<a class="nav-link' +
            (isActive ? ' active' : '') +
            '" data-nav-id="' +
            item.id +
            '" href="#' +
            item.id +
            '" role="tab" aria-selected="' +
            isActive +
            '">' +
            label +
            '</a>' +
            '</div>'
          );
        })
        .join(''),
      '</nav>',
      '<div class="header-actions">',
      // 主题切换按钮
      '<button class="header-btn theme-toggle-btn" aria-label="' + t('nav.themeToggle') + '" title="' + t('nav.themeToggle') + '">' +
      this._getThemeIcon() +
      '</button>',
      // 语言切换按钮
      '<button class="header-btn lang-toggle-btn" aria-label="' + t('nav.langToggle') + '" title="' + t('nav.langToggle') + '">' +
      '<span class="lang-label">' + (getLang() === 'zh' ? 'EN' : '中') + '</span>' +
      '</button>',
      // 汉堡菜单
      '<button class="hamburger" aria-label="' + t('nav.menuMobile') + '" aria-expanded="false">',
      '<span class="hamburger-icon">',
      '<span></span><span></span><span></span>',
      '</span>',
      '</button>',
      '</div>',
      '</div>',
      '</header>',
      '<div class="nav-overlay" aria-hidden="true"></div>',
      '<div class="nav-dropdown" role="menu">',
      this.items
        .map(function (item) {
          var isActive = item.id === self.activeId;
          var label = t(item.i18nKey) || item.label;
          return (
            '<a class="nav-link' +
            (isActive ? ' active' : '') +
            '" data-nav-id="' +
            item.id +
            '" href="#' +
            item.id +
            '" role="menuitem">' +
            label +
            '</a>'
          );
        })
        .join(''),
      '</div>',
    ].join('');
  }

  _getThemeIcon() {
    var isDark = getTheme() === 'dark';
    // 太阳图标 (当前是 dark 模式时显示，点击可切到 light)
    if (isDark) {
      return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    } else {
      return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12.5C2 12.5 3.5 11 5 11C7 11 8 14 10 14C13 14 14 8.5 14 8.5C12.5 10 10.5 10.5 9 9C7.5 7.5 8 4 8 4C6.5 5.5 3 6 2 12.5Z" fill="currentColor"/></svg>';
    }
  }

  _updateThemeIcon() {
    var btn = this.container.querySelector('.theme-toggle-btn');
    if (btn) {
      btn.innerHTML = this._getThemeIcon();
    }
  }

  _bindEvents() {
    var self = this;

    this.container.addEventListener('click', function (e) {
      var link = e.target.closest('[data-nav-id]');
      if (link) {
        e.preventDefault();
        var id = link.dataset.navId;
        self.setActive(id);
        self.onNavigate(id);
        self._closeMobileMenu();
      }
    });

    var themeBtn = this.container.querySelector('.theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        toggleTheme();
        self._updateThemeIcon();
      });
    }

    var langBtn = this.container.querySelector('.lang-toggle-btn');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        var nextLang = getLang() === 'zh' ? 'en' : 'zh';
        setLang(nextLang);
        var label = langBtn.querySelector('.lang-label');
        if (label) {
          label.textContent = nextLang === 'zh' ? 'EN' : '中';
        }
      });
    }

    var hamburger = this.container.querySelector('.hamburger');
    if (hamburger) {
      hamburger.addEventListener('click', function () {
        self._toggleMobileMenu();
      });
    }

    var overlay = this.container.querySelector('.nav-overlay');
    if (overlay) {
      overlay.addEventListener('click', function () {
        self._closeMobileMenu();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.isMobileMenuOpen) {
        self._closeMobileMenu();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && self.isMobileMenuOpen) {
        self._closeMobileMenu();
      }
    });
  }

  _toggleMobileMenu() {
    if (this.isMobileMenuOpen) {
      this._closeMobileMenu();
    } else {
      this._openMobileMenu();
    }
  }

  _openMobileMenu() {
    this.isMobileMenuOpen = true;
    var hamburger = this.container.querySelector('.hamburger');
    var overlay = this.container.querySelector('.nav-overlay');
    var dropdown = this.container.querySelector('.nav-dropdown');

    if (hamburger) {
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
    }
    if (overlay) overlay.classList.add('visible');
    if (dropdown) dropdown.classList.add('visible');

    document.body.style.overflow = 'hidden';
  }

  _closeMobileMenu() {
    this.isMobileMenuOpen = false;
    var hamburger = this.container.querySelector('.hamburger');
    var overlay = this.container.querySelector('.nav-overlay');
    var dropdown = this.container.querySelector('.nav-dropdown');

    if (hamburger) {
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
    if (overlay) overlay.classList.remove('visible');
    if (dropdown) dropdown.classList.remove('visible');

    document.body.style.overflow = '';
  }

  setActive(id) {
    this.activeId = id;

    var links = this.container.querySelectorAll('.nav-menu .nav-link');
    for (var i = 0; i < links.length; i++) {
      var isActive = links[i].dataset.navId === id;
      links[i].classList.toggle('active', isActive);
      links[i].setAttribute('aria-selected', isActive);
    }

    var dropdownLinks = this.container.querySelectorAll('.nav-dropdown .nav-link');
    for (var j = 0; j < dropdownLinks.length; j++) {
      dropdownLinks[j].classList.toggle('active', dropdownLinks[j].dataset.navId === id);
    }
  }
}