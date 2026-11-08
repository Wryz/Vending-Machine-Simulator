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
    branchTitle: '{name}에 지점을 낼까요?',
    branchBody: '회사의 돈, 챕터, 연구가 그대로 따라가고, {current}은(는) 자리를 비운 동안에도 계속 장사해요.',
    branch: '지점 열기',
    lockedTitle: '지점은 {n}장부터',
    lockedBody: '{n}장부터는 여는 모든 도시가 한 회사의 지점이 돼요. 그 전에는 {name}은(는) 돈도 따로인 별도 사업이에요.',
    separate: '따로 시작',
    farTitle: '{name}은(는) {n}장에서 열려요',
    farBody: '회사는 본거지에서 넓어져요. 먼저 주·도, 그다음 나라, 권역, 대륙, 마지막으로 전 세계로.',
    fullTitle: '지금은 {count}개 도시가 한도예요',
    fullBody: '회사는 {count}개 도시를 운영할 수 있어요. 다음 챕터에서 더 늘어나요.',
  },
  footer:
    '전환하면 이 도시가 먼저 저장돼요. 3장부터 도시들은 돈과 진행을 공유하는 한 회사의 지점이에요.',
  opening: '도시 여는 중…',
} satisfies Shape<typeof en>;
