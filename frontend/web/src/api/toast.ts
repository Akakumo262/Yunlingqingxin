import { message } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

/** 全局提示。main.tsx 启动后换成带主题的实例，这样提示条的颜色和圆角跟随设计令牌。 */
export const toast: { api: MessageInstance } = { api: message };
