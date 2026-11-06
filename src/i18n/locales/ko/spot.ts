// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spot';

export default {
  streetCorner: '길모퉁이',
  ratingA11y: '5점 중 {n}점',
  district: '{n}구역',
  venueLine: '{category} · {distance} · {n}구역',
  section: {
    machine: '자판기',
    why: '이유',
    nearby: '주변 장소',
  },
  owned: '{name} (보유)',
  stat: {
    now: '현재 손님',
    day: '영업일당',
    sales: '예상 매출/일',
  },
  perHour: '{n}/시',
  best: '추천: {list}',
  theft: '도난 위험: {risk}',
  risk: {
    low: '낮음',
    medium: '보통',
    high: '높음',
  },
  competitors: '경쟁: {n}',
  commission: '요구 수수료 ~{pct}',
  noNearby: '400 m 안에 이름 있는 장소가 없어요.',
  host: '설치처',
  use: '선택',
  report: '신고',
  disclaimer: '장소는 오픈 지도 데이터에서 가져와요. 제휴나 보증과는 무관해요.',
  districtLocked: '이 구역은 이후 챕터에서 해금돼요.',
  placeMine: '여기에 내 자판기 설치',
  placeType: '여기에 {type} 설치',
  reportAlert: {
    title: '이 장소를 신고할까요?',
    body: '{name}이(가) 게임에서 숨겨져요.',
    cancel: '취소',
    hide: '숨기기',
  },
} satisfies Shape<typeof en>;
