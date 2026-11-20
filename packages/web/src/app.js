/**
 * 应用主控制器
 * 协调导航和内容渲染模块
 */
import { Navigation } from './components/navigation.js';
import { ContentRenderer } from './components/contentRenderer.js';
import { TableOfContents } from './components/tableOfContents.js';
import { getDocumentRegistry, navItems } from './data/documents.js';
import { onLangChange, t } from './i18n/index.js';

class App {
  constructor() {
    this.nav = null;
    this.renderer = null;
    this.toc = null;
    this.currentDocKey = navItems[0]?.id || 'requirements';
    /** @type {Array<{id:string, text:string, level:number}>} */
    this._latestHeadings = [];
  }

  init() {
    var appRoot = document.getElementById('app');
    if (!appRoot) {
      console.error('找不到 #app 挂载节点');
      return;
    }

    appRoot.innerHTML = '';

    // 导航栏
    var navDiv = document.createElement('div');
    navDiv.id = 'nav-container';

    // 内容 + 目录横向布局
    var contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';

    var mainEl = document.createElement('main');
    mainEl.className = 'main-content';
    mainEl.id = 'content-container';

    var tocEl = document.createElement('aside');
    tocEl.className = 'toc-sidebar';
    tocEl.id = 'toc-container';

    contentWrapper.appendChild(mainEl);
    contentWrapper.appendChild(tocEl);

    appRoot.appendChild(navDiv);
    appRoot.appendChild(contentWrapper);

    // 返回顶部按钮
    var scrollTopBtn = document.createElement('button');
    scrollTopBtn.className = 'scroll-top-btn';
    scrollTopBtn.setAttribute('aria-label', '返回顶部');
    scrollTopBtn.setAttribute('title', '返回顶部');
    scrollTopBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
    scrollTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    appRoot.appendChild(scrollTopBtn);

    // === 移动端浮动目录按钮 ===
    var mobileTocToggle = document.createElement('button');
    mobileTocToggle.className = 'mobile-toc-toggle';
    mobileTocToggle.setAttribute('aria-label', t('toc.label'));
    mobileTocToggle.setAttribute('title', t('toc.label'));
    mobileTocToggle.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';
    appRoot.appendChild(mobileTocToggle);

    // 移动端目录面板（底部弹出）
    var mobileTocBackdrop = document.createElement('div');
    mobileTocBackdrop.className = 'mobile-toc-panel-backdrop';
    mobileTocBackdrop.setAttribute('aria-hidden', 'true');
    appRoot.appendChild(mobileTocBackdrop);

    var mobileTocPanel = document.createElement('div');
    mobileTocPanel.className = 'mobile-toc-panel';
    mobileTocPanel.id = 'mobile-toc-panel';
    appRoot.appendChild(mobileTocPanel);

    var self = this;

    // 移动端目录交互
    mobileTocToggle.addEventListener('click', function () {
      self._toggleMobileToc(true);
    });
    mobileTocBackdrop.addEventListener('click', function () {
      self._toggleMobileToc(false);
    });

    // 目录组件
    this.toc = new TableOfContents(tocEl);

    // 导航
    this.nav = new Navigation(navDiv, navItems, function (docKey) {
      self._handleNavigate(docKey);
    });

    // 渲染器，渲染完成后回调目录
    this.renderer = new ContentRenderer(mainEl, function (headings) {
      self._latestHeadings = headings;
      self.toc.build(headings);
      self._buildMobileToc(headings);
    });

    var hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    var docReg = getDocumentRegistry();
    var initialDocKey = hash && docReg[hash] ? hash : this.currentDocKey;
    this._navigateTo(initialDocKey, true);

    window.addEventListener('hashchange', function () {
      var newHash = window.location.hash ? window.location.hash.replace('#', '') : '';
      var docReg2 = getDocumentRegistry();
      if (newHash && docReg2[newHash] && newHash !== self.currentDocKey) {
        self._navigateTo(newHash, false);
      }
    });

    onLangChange(function () {
      self._updatePageTitle();
      self._navigateTo(self.currentDocKey, true);
    });

    // 返回顶部按钮显隐控制
    window.addEventListener('scroll', function () {
      var threshold = 400;
      if (window.scrollY > threshold) {
        scrollTopBtn.classList.add('scroll-top-btn--visible');
      } else {
        scrollTopBtn.classList.remove('scroll-top-btn--visible');
      }
    }, { passive: true });

    // 表格横向滚动检测
    this._initTableScrollDetection();
  }

  /**
   * 切换移动端目录面板
   */
  _toggleMobileToc(show) {
    var panel = document.getElementById('mobile-toc-panel');
    var backdrop = document.querySelector('.mobile-toc-panel-backdrop');
    if (!panel || !backdrop) return;

    if (show) {
      panel.classList.add('visible');
      backdrop.classList.add('visible');
      backdrop.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    } else {
      panel.classList.remove('visible');
      backdrop.classList.remove('visible');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  /**
   * 构建移动端目录内容
   */
  _buildMobileToc(headings) {
    var panel = document.getElementById('mobile-toc-panel');
    if (!panel) return;

    panel.innerHTML = '';

    if (!headings || headings.length === 0) return;

    var label = document.createElement('div');
    label.className = 'toc-label';
    label.textContent = t('toc.label');
    panel.appendChild(label);

    var self = this;
    headings.forEach(function (h) {
      var a = document.createElement('a');
      a.className = 'toc-item' + (h.level === 3 ? ' toc-item--sub' : '');
      a.href = '#' + h.id;
      a.textContent = h.text;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        self._toggleMobileToc(false);
        var target = document.getElementById(h.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      panel.appendChild(a);
    });

    // 滚动时高亮当前激活项
    this._observeMobileToc(headings);
  }

  /**
   * IntersectionObserver 同步移动端目录高亮
   */
  _observeMobileToc(headings) {
    if (this._mobileTocObserver) this._mobileTocObserver.disconnect();

    var panel = document.getElementById('mobile-toc-panel');
    if (!panel) return;

    var self = this;
    this._mobileTocObserver = new IntersectionObserver(
      function (entries) {
        var visibleId = null;
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            visibleId = entry.target.id;
          }
        });
        if (visibleId && panel) {
          var links = panel.querySelectorAll('.toc-item');
          links.forEach(function (a) {
            var id = a.getAttribute('href').replace('#', '');
            a.classList.toggle('toc-item--active', id === visibleId);
          });
        }
      },
      { rootMargin: '-100px 0px -60% 0px' }
    );

    headings.forEach(function (h) {
      var el = document.getElementById(h.id);
      if (el) self._mobileTocObserver.observe(el);
    });
  }

  /**
   * 检测表格是否需要横向滚动，添加渐变指示器
   */
  _initTableScrollDetection() {
    var self = this;
    // 使用 MutationObserver 监听内容变化后重新绑定
    var contentContainer = document.getElementById('content-container');

    var checkTableScroll = function () {
      var wrappers = document.querySelectorAll('.doc-table-wrapper');
      wrappers.forEach(function (wrapper) {
        var isScrollable = wrapper.scrollWidth > wrapper.clientWidth + 1;
        if (isScrollable) {
          wrapper.classList.add('is-scrollable');
        } else {
          wrapper.classList.remove('is-scrollable');
        }
      });
    };

    // 监听表格滚动更新渐变状态
    document.addEventListener('scroll', function (e) {
      var wrapper = e.target.closest('.doc-table-wrapper');
      if (!wrapper) return;
      var isAtEnd = wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - 2;
      if (isAtEnd) {
        wrapper.classList.add('is-scrolled-end');
      } else {
        wrapper.classList.remove('is-scrolled-end');
      }
    }, true);

    // 初始检测 + resize 重新检测
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        checkTableScroll();
      });
      if (contentContainer) ro.observe(contentContainer);
    }

    // 每次渲染后检测
    if (contentContainer) {
      var mo = new MutationObserver(function () {
        setTimeout(checkTableScroll, 100);
      });
      mo.observe(contentContainer, { childList: true, subtree: true });
    }

    window.addEventListener('resize', function () {
      checkTableScroll();
    });

    setTimeout(checkTableScroll, 300);
  }

  _handleNavigate(docKey) {
    if (docKey !== this.currentDocKey) {
      this._navigateTo(docKey, false);
    }
  }

  _navigateTo(docKey, isInit) {
    this.currentDocKey = docKey;
    var docRegistry = getDocumentRegistry();
    var doc = docRegistry[docKey];

    if (doc) {
      this.renderer.render(doc, docKey);
      this.nav.setActive(docKey);

      if (window.location.hash !== '#' + docKey) {
        history.replaceState(null, '', '#' + docKey);
      }
    }

    this._updatePageTitle();

    // 非首次渲染时关闭移动端菜单和目录
    if (!isInit) {
      this._toggleMobileToc(false);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  _updatePageTitle() {
    document.title = t('page.title');
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t('page.description'));
    }
  }
}

export function initApp() {
  var app = new App();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      app.init();
    });
  } else {
    app.init();
  }
}