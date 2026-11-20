/**
 * AgentDesk业务智能体 - 文档数据入口
 *
 * 支持中英文双语切换
 */
import { requirementsDoc } from './requirements.js';
import { quotationDoc } from './quotation.js';
import { checklistDoc } from './checklist.js';
import { clarificationDoc } from './clarification.js';
import { techSelectionDoc } from './tech-selection.js';

import { requirementsDocEn } from './requirements-en.js';
import { quotationDocEn } from './quotation-en.js';
import { checklistDocEn } from './checklist-en.js';
import { clarificationDocEn } from './clarification-en.js';
import { techSelectionDocEn } from './tech-selection-en.js';

import { getLang } from '../i18n/index.js';

/**
 * 中文文档注册表
 */
var documentRegistryZh = {
  requirements: requirementsDoc,
  quotation: quotationDoc,
  checklist: checklistDoc,
  clarification: clarificationDoc,
  'tech-selection': techSelectionDoc,
};

/**
 * 英文文档注册表
 */
var documentRegistryEn = {
  requirements: requirementsDocEn,
  quotation: quotationDocEn,
  checklist: checklistDocEn,
  clarification: clarificationDocEn,
  'tech-selection': techSelectionDocEn,
};

/**
 * 根据当前语言获取文档注册表
 */
export function getDocumentRegistry() {
  return getLang() === 'en' ? documentRegistryEn : documentRegistryZh;
}

/**
 * 默认导出的中文注册表（向后兼容）
 */
export var documentRegistry = documentRegistryZh;

/**
 * 导航菜单配置
 * id: 与 documentRegistry 中的 key 对应
 * label: 菜单默认显示文字（中文）
 * i18nKey: i18n 翻译键
 */
export var navItems = [
  { id: 'requirements', label: '需求调研', i18nKey: 'nav.requirements' },
  { id: 'tech-selection', label: '技术选型', i18nKey: 'nav.techSelection' },
  { id: 'quotation', label: '项目报价', i18nKey: 'nav.quotation' },
  { id: 'checklist', label: '对接清单', i18nKey: 'nav.checklist' },
  { id: 'clarification', label: '问题澄清', i18nKey: 'nav.clarification' },
];