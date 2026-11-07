// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/requests';

export default {
  reason: {
    thirsty: '{place}에서 막 먹었어요. 너무 목말라요!',
    studying: '{place}에서 늦게까지 공부 중. 에너지가 필요해요!',
    dorm: '{place} 근처 기숙사에 생필품이 떨어졌어요.',
    charging: '{place} 근처에서 폰 배터리가 없어요!',
    afterSchool: '{place} 하교 시간. 간식 타임!',
    workout: '{place}에서 막 운동했어요.',
    deadline: '{place}에서 큰 마감이 있어요.',
    visiting: '{place}에 병문안 왔어요.',
    patient: '{place}에서 막 나왔어요. 몸이 안 좋아요.',
    travel: '{place}에서 이동 중이에요.',
    game: '{place} 경기 날!',
    sunny: '{place}에서 햇볕 아래 있어요.',
    lateNight: '{place}에서 긴 밤…',
    sweetTooth: '{place} 다음엔 단 게 당겨요.',
    shopping: '{place}에서 쇼핑 중 휴식.',
    forgot: '{place}에 두고 왔어요!',
    home: '집에서 잠깐 나왔어요.',
  },
  card: {
    label: '손님 요청',
    title: '{product} 원해요',
    load: '넣기',
    loaded: '이제 보충을 탭하세요',
    waiting: '{time} 기다림',
    tip: '팁 {amount}',
    otherMachine: '이 자판기로는 못 팔아요. {m}m 안에 ‘{type}’을 설치하세요.',
    locked: '{n}장에서 열려요.',
  },
  served: {
    label: '요청 완료',
    title: '{venue}에서 {product}',
    subtitle: '판매 완료, 팁도 받았어요',
  },
  a11y: {
    bubble: '손님 요청: {product}. 탭하면 자판기가 열려요.',
  },
} satisfies Shape<typeof en>;
