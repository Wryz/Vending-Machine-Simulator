// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/cities';

export default {
  title: '도시',
  subtitle: '도시마다 사업이 따로 저장돼요',
  section: {
    current: '현재 도시',
    area: '내 지역',
    cities: '도시',
  },
  chapterMachines: {
    one: '챕터 {chapter} · 자판기 {n}대',
    other: '챕터 {chapter} · 자판기 {n}대',
  },
  label: {
    saved: '저장됨',
    current: '현재',
    newSave: '새 저장',
  },
  a11y: {
    row: '{name}, 현지 시각 {time}, {label}',
    switchHint: '이 도시로 전환',
  },
  openFailed: '그 도시를 열 수 없어요.',
  confirm: {
    startTitle: '{name}에서 시작할까요?',
    goTitle: '{name}(으)로 갈까요?',
    startBody: '새 저장으로 새 사업을 시작해요. {current}의 진행 상황은 저장돼요.',
    goBody: '{current}의 진행 상황을 먼저 저장해요.',
    thisCity: '이 도시',
    cancel: '취소',
    start: '시작',
    go: '이동',
  },
  footer:
    '전환하면 이 사업을 먼저 저장해요. 챕터 5를 마치면 회사를 매각하고 어디서든 유리하게 다시 시작할 수 있어요.',
  opening: '도시 여는 중…',
} satisfies Shape<typeof en>;
