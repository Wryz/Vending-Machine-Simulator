// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/store';

export default {
  stillCounting: '还在数硬币。',
  noGame: '没有加载游戏。',
  load: {
    noApi: '未配置数据 API。',
    badPack: '不支持的地区数据包。',
    noPack: '没有内置 {id} 的数据包',
    http: 'HTTP {status}',
  },
} satisfies Shape<typeof en>;
