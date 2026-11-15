import Taro from '@tarojs/taro';

/**
 * 行内样式专用：把按 375 宽写的像素换算成随屏幕缩放的单位（小程序里是 rpx，H5 里是 rem）。
 * Taro 只会换算样式文件里的 px，不会换算 TSX 行内样式，所以行内的尺寸一律包一层 px()。
 *   style={{ marginTop: px('12px'), padding: px('14px 16px') }}
 */
export const px = (v: string | number): string =>
  typeof v === 'number' ? Taro.pxTransform(v * 2) : v.replace(/(\d+(?:\.\d+)?)px/g, (_, n: string) => Taro.pxTransform(Number(n) * 2));

let top: number | null = null;
/** 自定义导航栏页面的顶部留白：状态栏高度 + 28，真实像素（状态栏高度本身不随屏幕缩放） */
export const safeTop = (): number => (top ??= (Taro.getSystemInfoSync().statusBarHeight || 0) + 28);
