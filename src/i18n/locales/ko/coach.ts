// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: '첫 자판기를 설치하세요',
      line: '붐비는 거리를 탭하세요. 불꽃 키를 누르면 사람들이 다니는 곳이 보여요.',
    },
    stock: {
      title: '상품을 채우세요',
      line: '자판기를 탭하고 채우기, 보충을 누르세요.',
    },
    wait: {
      title: '손님을 기다리세요',
      line: '확대하면 사람들이 와서 사는 모습을 볼 수 있어요.',
    },
    collect: {
      title: '현금을 수금하세요',
      line: '자판기를 탭하고 돈통을 비우세요.',
    },
    goal: {
      title: '첫 번째 목표',
      line: '매출 {amount}을 달성하면 챕터 1 완료예요. 위의 게이지로 확인하세요.',
    },
  },
  ok: 'OK',
  a11y: {
    gotIt: '알겠어요',
    close: '튜토리얼 닫기',
  },
} satisfies Shape<typeof en>;
