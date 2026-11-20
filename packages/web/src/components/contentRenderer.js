/**
 * 内容渲染组件
 * 根据文档数据结构动态渲染页面内容，支持卡片化分组、表格、列表、段落等多种元素
 */
import { t } from '../i18n/index.js';

export class ContentRenderer {
  /**
   * @param {HTMLElement} container - 内容挂载容器
   * @param {Function} [onHeadings] - 渲染完成后回调，参数为 headings 数组
   */
  constructor(container, onHeadings) {
    this.container = container;
    this.currentDocKey = null;
    this._onHeadings = onHeadings || null;
    this._headingCounters = {};
  }

  /**
   * 渲染指定文档
   * @param {Object} doc - 文档数据对象 { title, sections }
   * @param {string} docKey - 文档 key，用于过渡动画判断
   */
  render(doc, docKey) {
    if (!doc || !doc.sections) {
      this.container.innerHTML =
        '<div class="document-container"><p class="doc-paragraph">' + t('content.loading') + '</p></div>';
      return;
    }

    var isSameDoc = this.currentDocKey === docKey;
    this.currentDocKey = docKey;

    var wrapper = document.createElement('div');
    wrapper.className = 'document-container';

    // 文档标题
    var title = document.createElement('h1');
    title.className = 'document-title';
    title.textContent = doc.title;
    wrapper.appendChild(title);

    // === 汇总卡片（位于标题下方、内容上方） ===
    if (doc.cards && doc.cards.length > 0) {
      wrapper.appendChild(this._renderCards(doc.cards));
    }

    // 重置计数器，收集标题信息
    this._headingCounters = {};
    var headings = [];

    // === 卡片化处理：仅对标记 card:true 的 h2 章节包裹卡片 ===
    var self = this;
    var sectionGroups = [];
    var currentGroup = null;

    doc.sections.forEach(function (section) {
      if (section.type === 'heading' && section.level === 2) {
        if (currentGroup) {
          sectionGroups.push(currentGroup);
        }
        currentGroup = { heading: section, sections: [], isCard: !!section.card };
      } else if (currentGroup) {
        currentGroup.sections.push(section);
      } else {
        // h2 之前的独立内容
        var standaloneEl = self._renderSection(section, headings);
        if (standaloneEl) {
          standaloneEl.classList.add('doc-standalone');
          wrapper.appendChild(standaloneEl);
        }
      }
    });

    if (currentGroup) {
      sectionGroups.push(currentGroup);
    }

    // 按标记分别渲染：card 组包裹在 doc-card 中，非 card 组直接追加
    sectionGroups.forEach(function (group) {
      // 渲染 h2 标题
      var h2El = self._renderSection(group.heading, headings);

      if (group.isCard) {
        var card = document.createElement('div');
        card.className = 'doc-card';
        if (h2El) card.appendChild(h2El);
        group.sections.forEach(function (section) {
          var el = self._renderSection(section, headings);
          if (el) card.appendChild(el);
        });
        wrapper.appendChild(card);
      } else {
        // 非卡片：直接追加 h2 和其下内容
        if (h2El) wrapper.appendChild(h2El);
        group.sections.forEach(function (section) {
          var el = self._renderSection(section, headings);
          if (el) wrapper.appendChild(el);
        });
      }
    });

    // 如果是同一文档不重新创建动画，直接替换内容
    if (isSameDoc) {
      this.container.innerHTML = '';
      this.container.appendChild(wrapper);
      // 回调标题数据供目录导航使用（语言切换后 TOC 需同步更新）
      if (this._onHeadings) {
        this._onHeadings(headings);
      }
      return;
    }

    // 使用 requestAnimationFrame 确保动画触发
    this.container.innerHTML = '';
    this.container.appendChild(wrapper);

    // 回调标题数据供目录导航使用
    if (this._onHeadings) {
      this._onHeadings(headings);
    }
  }

  /**
   * 渲染汇总卡片
   * cards: Array<{ label: string, value: string }>
   */
  _renderCards(cards) {
    var grid = document.createElement('div');
    grid.className = 'doc-cards-grid';

    cards.forEach(function (card) {
      var item = document.createElement('div');
      item.className = 'doc-summary-card';

      var label = document.createElement('div');
      label.className = 'doc-summary-card-label';
      label.textContent = card.label;

      var value = document.createElement('div');
      value.className = 'doc-summary-card-value';
      value.innerHTML = card.value;

      item.appendChild(label);
      item.appendChild(value);
      grid.appendChild(item);
    });

    return grid;
  }

  /**
   * 渲染双列实体卡片（使用方 / 平台方等）
   * cards: Array<{ title: string, headers: string[], rows: string[][] }>
   */
  _renderDualCards(section) {
    var self = this;
    var grid = document.createElement('div');
    grid.className = 'doc-dual-cards';

    section.cards.forEach(function (card) {
      var entityCard = document.createElement('div');
      entityCard.className = 'doc-entity-card';

      // 卡片标题
      var title = document.createElement('div');
      title.className = 'doc-entity-card-title';
      title.textContent = card.title;
      entityCard.appendChild(title);

      // 内嵌表格
      var tableWrapper = document.createElement('div');
      tableWrapper.className = 'doc-table-wrapper';

      var table = document.createElement('table');
      table.className = 'doc-table';

      var thead = document.createElement('thead');
      var headerRow = document.createElement('tr');
      card.headers.forEach(function (header) {
        var th = document.createElement('th');
        th.innerHTML = header;
        th.scope = 'col';
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      card.rows.forEach(function (row) {
        var tr = document.createElement('tr');
        row.forEach(function (cell) {
          var td = document.createElement('td');
          td.innerHTML = cell;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      tableWrapper.appendChild(table);
      entityCard.appendChild(tableWrapper);
      grid.appendChild(entityCard);
    });

    return grid;
  }

  /**
   * 根据 Section 类型渲染对应元素
   * @param {Object} section - 节数据对象
   * @returns {HTMLElement|null}
   */
  _renderSection(section, headings) {
    switch (section.type) {
      case 'heading':
        return this._renderHeading(section, headings);
      case 'paragraph':
        return this._renderParagraph(section);
      case 'table':
        return this._renderTable(section);
      case 'list':
        return this._renderList(section);
      case 'dual-cards':
        return this._renderDualCards(section);
      case 'mermaid':
        return this._renderMermaid(section);
      default:
        console.warn(`Unknown section type: ${section.type}`);
        return null;
    }
  }

  /**
   * 渲染标题
   */
  _renderHeading(section, headings) {
    var tag = section.level === 3 ? 'h3' : 'h2';
    var el = document.createElement(tag);
    el.className =
      section.level === 3
        ? 'doc-section-subheading'
        : 'doc-section-heading';

    // 生成唯一锚点 id
    var slug = this._slugify(section.text);
    var key = section.level + '-' + slug;
    if (!this._headingCounters[key]) {
      this._headingCounters[key] = 0;
    }
    this._headingCounters[key]++;
    var id = slug + (this._headingCounters[key] > 1 ? '-' + this._headingCounters[key] : '');
    el.id = id;

    // 收集标题信息供 TOC 使用（纯文本，不含高亮标签）
    var tmp = document.createElement('div');
    tmp.innerHTML = section.text;
    var plainText = (tmp.textContent || '').trim();

    headings.push({
      id: id,
      text: plainText,
      level: section.level,
    });

    el.innerHTML = section.text;
    return el;
  }

  /**
   * 渲染段落
   */
  _renderParagraph(section) {
    const el = document.createElement('p');
    el.className = 'doc-paragraph';
    el.innerHTML = section.text;
    return el;
  }

  /**
   * 渲染表格
   * headers: string[] - 表头数组
   * rows: string[][] - 二维数据数组
   */
  _renderTable(section) {
    const wrapper = document.createElement('div');
    wrapper.className = 'doc-table-wrapper';

    const table = document.createElement('table');
    table.className = 'doc-table';

    // 表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    section.headers.forEach((header) => {
      const th = document.createElement('th');
      th.innerHTML = header;
      th.scope = 'col';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 表体
    const tbody = document.createElement('tbody');
    section.rows.forEach((row, rowIndex) => {
      const tr = document.createElement('tr');
      row.forEach((cell) => {
        const td = document.createElement('td');
        td.innerHTML = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    wrapper.appendChild(table);
    return wrapper;
  }

  /**
   * 渲染列表
   * ordered: boolean - 是否有序列表
   * items: string[] - 列表项数组
   */
  _renderList(section) {
    const tag = section.ordered ? 'ol' : 'ul';
    const el = document.createElement(tag);
    el.className = `doc-list ${section.ordered ? 'ordered' : 'unordered'}`;

    section.items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'doc-list-item';
      li.innerHTML = item;
      el.appendChild(li);
    });

    return el;
  }

  /**
   * 渲染 Mermaid 图表（泳道图、时序图等）
   * mermaid.render() 返回 Promise<{ svg }>，先返回占位容器再异步填充
   * @param {Object} section - { type: 'mermaid', text: string }
   */
  _renderMermaid(section) {
    var container = document.createElement('div');
    container.className = 'doc-mermaid';

    var id = 'mermaid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    // 占位态
    container.innerHTML = '<div style="text-align:center;padding:24px 0;color:var(--color-text-tertiary);font-size:var(--font-size-sm);">Loading diagram...</div>';

    var mermaidLib = window.mermaid;
    if (!mermaidLib) {
      container.innerHTML = '<pre class="doc-code-block">' + section.text + '</pre>';
      return container;
    }

    // 异步渲染，完成后替换占位内容
    var self = this;
    mermaidLib.render(id, section.text)
      .then(function (result) {
        var svg = typeof result === 'string' ? result : result.svg;
        container.innerHTML = svg || '<pre class="doc-code-block">' + section.text + '</pre>';
      })
      .catch(function (e) {
        console.warn('Mermaid render failed, falling back to text:', e);
        container.innerHTML = '<pre class="doc-code-block">' + section.text + '</pre>';
      });

    return container;
  }

  /**
   * 从标题文本生成 URL 友好的锚点 slug
   * 去除 HTML 标签，保留中文和字母数字
   */
  _slugify(text) {
    var div = document.createElement('div');
    div.innerHTML = text;
    var plain = (div.textContent || '').trim();
    return plain
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      || 'section';
  }
}