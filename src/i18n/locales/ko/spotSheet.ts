// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/spotSheet';

export default {
  streetCorner: '길모퉁이',
  district: '{n}구역',
  venueLine: '{category} · {distance}',
  perHour: '시간당',
  perDay: '하루',
  yours: '{type} (보유)',
  districtLocked: '이 지역은 {n}장에서 열려요. 지금 둘 수 있는 곳은 주황색 선 안쪽이에요.',
  lockedType: '🔒 {type} · {n}장',
  hoodLocked: '{name}은(는) {n}장에서 열려요. 지금 둘 수 있는 곳은 주황색 선 안쪽이에요.',
  placeMine: '여기에 내 자판기 설치',
  placeType: '{type} 설치',
  nearby: '주변',
  noNearby: '400 m 안에 이름 있는 장소가 없어요.',
  placeLine: '{category} · {distance}',
  host: '설치처',
  use: '선택',
  report: '신고',
  attribution: '장소는 오픈 지도 데이터 기반. 제휴나 보증과는 무관해요.',
  about: '이 지역 정보',
  passing: '통행/시간',
  residents: '주민',
  vending: '근처 자판기: 내 것 {yours} · 라이벌 {rival} · 가게 {stores}',
  night: {
    low: '밤에도 활기참: 자판기에 안전',
    medium: '밤에는 조용함',
    high: '밤에는 한적함: 파손이 잦아요',
  },
  a11y: {
    passing: '시간당 {n}명 통행',
    residents: '주민 {n}명',
    customers: '시간당 손님 {n}명',
    sales: '하루 매출 {amount}',
  },
  reportAlert: {
    title: '이 장소를 신고할까요?',
    body: '{name}이(가) 게임에서 숨겨져요.',
    cancel: '취소',
    confirm: '숨기기',
  },
} satisfies Shape<typeof en>;
