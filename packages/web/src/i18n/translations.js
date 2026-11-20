/**
 * 国际化翻译字典
 * 标题相关值统一来自 ../config.js
 */
import { SITE_TITLE, SITE_DESCRIPTION, BRAND_TITLE, SITE_TITLE_EN, SITE_DESCRIPTION_EN, BRAND_TITLE_EN } from '../config.js';

export const translations = {
  zh: {
    'page.title': SITE_TITLE,
    'page.description': SITE_DESCRIPTION,
    'brand.title': BRAND_TITLE,
    'nav.menu': '主导航菜单',
    'nav.requirements': '需求调研',
    'nav.quotation': '项目报价',
    'nav.checklist': '对接清单',
    'nav.clarification': '问题澄清',
    'nav.techSelection': '技术选型',
    'nav.themeToggle': '切换主题',
    'nav.langToggle': '切换语言',
    'nav.menuMobile': '移动端菜单',
    'content.loading': '文档加载中...',
    'toc.label': '目录',
  },
  en: {
    'page.title': SITE_TITLE_EN,
    'page.description': SITE_DESCRIPTION_EN,
    'brand.title': BRAND_TITLE_EN,
    'nav.menu': 'Main navigation menu',
    'nav.requirements': 'Requirements',
    'nav.quotation': 'Project Quotation',
    'nav.checklist': 'Checklist',
    'nav.clarification': 'Q&A',
    'nav.techSelection': 'Tech Selection',
    'nav.themeToggle': 'Toggle theme',
    'nav.langToggle': 'Toggle language',
    'nav.menuMobile': 'Mobile menu',
    'content.loading': 'Loading document...',
    'toc.label': 'Contents',
  },
};