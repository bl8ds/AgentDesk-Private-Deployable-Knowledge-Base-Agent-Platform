/**
 * 右侧目录导航组件
 * IntersectionObserver 实现滚动跟随高亮
 */
import { t, onLangChange } from '../i18n/index.js';

export class TableOfContents {
  constructor(container) {
    this.container = container;
    this.headings = [];
    this.observer = null;

    var self = this;
    onLangChange(function () {
      if (self.headings.length > 0) {
        self.build(self.headings);
      }
    });
  }

  build(headings) {
    this.headings = headings;
    this.container.innerHTML = '';

    if (!headings || headings.length === 0) return;

    var label = document.createElement('div');
    label.className = 'toc-label';
    label.textContent = t('toc.label');
    this.container.appendChild(label);

    var nav = document.createElement('nav');
    nav.className = 'toc-list';

    var self = this;
    headings.forEach(function (h) {
      var a = document.createElement('a');
      a.className = 'toc-item' + (h.level === 3 ? ' toc-item--sub' : '');
      a.href = '#' + h.id;
      a.textContent = h.text;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById(h.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      nav.appendChild(a);
    });

    this.container.appendChild(nav);
    this._observe();
  }

  _observe() {
    if (this.observer) this.observer.disconnect();

    var self = this;
    this.observer = new IntersectionObserver(
      function (entries) {
        var visibleId = null;
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            visibleId = entry.target.id;
          }
        });
        if (visibleId) {
          var links = self.container.querySelectorAll('.toc-item');
          links.forEach(function (a) {
            var id = a.getAttribute('href').replace('#', '');
            a.classList.toggle('toc-item--active', id === visibleId);
          });
        }
      },
      { rootMargin: '-100px 0px -60% 0px' }
    );

    this.headings.forEach(function (h) {
      var el = document.getElementById(h.id);
      if (el) self.observer.observe(el);
    });
  }

  destroy() {
    if (this.observer) this.observer.disconnect();
  }
}