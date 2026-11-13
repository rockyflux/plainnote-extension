import type { NoteFormat } from '@/types';

/** UI-only fixtures for framework phase. Not wired to PlainNote API. */
export interface DemoNote {
  id: string;
  title: string;
  preview: string;
  format: NoteFormat;
  favorite: boolean;
  updatedAt: number;
  content: string;
}

export const DEMO_NOTES: DemoNote[] = [
  {
    id: 'demo-1',
    title: '欢迎使用 PlainNote 扩展',
    preview: '这是界面框架阶段的示例笔记，尚未连接远端 API。',
    format: 'markdown',
    favorite: true,
    updatedAt: Date.now() - 3600_000,
    content:
      '# 欢迎使用 PlainNote 扩展\n\n这是界面框架阶段的示例笔记，尚未连接远端 API。\n\n- Popup 快速记录\n- Side Panel 列表与编辑\n- Options 服务与语言',
  },
  {
    id: 'demo-2',
    title: '设计备忘',
    preview: '蓝白配色、8px 圆角、轻分割线，对齐 PlainNote 网站风格。',
    format: 'text',
    favorite: false,
    updatedAt: Date.now() - 86_400_000,
    content: '蓝白配色、8px 圆角、轻分割线，对齐 PlainNote 网站风格。',
  },
];
