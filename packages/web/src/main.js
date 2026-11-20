/**
 * 应用入口文件
 * 按序加载样式、初始化国际化、然后启动应用
 */
import './styles/variables.css';
import './styles/base.css';
import './styles/nav.css';
import './styles/content.css';
import './styles/table.css';
import './styles/toc.css';
import './styles/responsive.css';
import './styles/scroll-top.css';
import { initI18n } from './i18n/index.js';

import { initApp } from './app.js';

initI18n();
initApp();