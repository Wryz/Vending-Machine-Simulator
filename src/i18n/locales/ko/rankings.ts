// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/rankings';

export default {
  title: '최고의 운영자',
  subtitle: '이번 주 {city}',
  you: '나',
  rivalTag: '라이벌',
  day: '7일 중 {n}일째 · 자정에 업데이트',
  final: '최종 순위 · 오늘부터 새로운 주',
  preview: '실시간 미리보기 · 첫 순위는 자정에',
  of: '/{n}',
  overnightUp: { one: '밤사이 {n}계단 상승', other: '밤사이 {n}계단 상승' },
  overnightDown: { one: '밤사이 {n}계단 하락', other: '밤사이 {n}계단 하락' },
  overnightSame: '어젯밤과 같은 순위',
  climbed: '밤사이 {from}위에서 {to}위로 올랐어요',
  thisWeek: '이번 주 내 매출',
  toPass: '{amount} 더 팔면 {name} 추월',
  leading: '도시 1위예요. 계속 지켜요!',
  lastWeek: '지난주: {n}명 중 {rank}위',
  howItWorks: '월요일부터의 매출로 순위를 매겨요. 매일 밤 현지 시각 자정에 업데이트돼요.',
  a11y: {
    row: '{rank}위 {name}: {amount}',
    chip: '도시 순위 {n}명 중 {rank}위. 순위표를 열어요.',
  },
  moment: {
    label: '도시 순위',
    passed: '{name}을(를) 추월했어요!',
    top: '{city}에서 1위예요!',
    rank: '{city}에서 {rank}위',
  },
  company: {
    section: '도시 순위',
    open: '순위표 보기',
    none: '첫 순위는 자정에 나와요.',
  },
} satisfies Shape<typeof en>;
