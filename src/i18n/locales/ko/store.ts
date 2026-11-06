// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/store';

export default {
  stillCounting: '아직 동전을 세는 중이에요.',
  noGame: '불러온 게임이 없어요.',
  load: {
    noApi: '데이터 API가 설정되지 않았어요.',
    badPack: '지원하지 않는 지역 팩이에요.',
    noPack: '{id}용 내장 팩이 없어요',
    http: 'HTTP {status}',
  },
} satisfies Shape<typeof en>;
