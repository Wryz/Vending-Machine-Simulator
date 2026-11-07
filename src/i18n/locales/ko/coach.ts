// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/coach';

export default {
  steps: {
    place: {
      title: '첫 자판기를 설치하세요',
      line: '붐비는 거리일수록 많이 팔려요. 불꽃 키로 확인하거나 좋은 자리를 골라 달라고 하세요.',
      action: '좋은 자리 보여 줘',
      actionHint: '근처의 붐비는 자리를 찾아 카드를 열어요',
    },
    stock: {
      title: '간식을 채우세요',
      line: '자판기가 비어 있어요. 열어서 밴에서 간식을 채우세요.',
      action: '내 자판기 열기',
      actionHint: '자판기 카드를 열어요',
    },
    delivery: {
      title: '밴이 가고 있어요',
      /** {store} = a warehouse or wholesaler name from map data. */
      line: '{store}에서 간식을 싣고 와요. 자판기까지 달려가는 걸 지켜보세요!',
      lineDepot: '창고에서 간식을 싣고 와요. 자판기까지 달려가는 걸 지켜보세요!',
      action: '도착 보기',
      actionHint: '지도를 내 자판기로 확대해요',
    },
    wait: {
      title: '손님을 기다리세요',
      line: '지나가던 사람들이 멈춰서 사 가요. 확대해서 구경해 보세요!',
      action: '내 자판기 보기',
      actionHint: '지도를 자판기로 확대해요',
    },
    collect: {
      title: '동전을 수금하세요',
      line: '팔렸어요! 자판기를 열고 동전을 꺼내세요.',
      action: '내 자판기 열기',
      actionHint: '자판기 카드를 열어요',
    },
    goal: {
      title: '첫 번째 목표',
      line: '매출 {amount}을 달성하면 1장이 끝나요. 위쪽 미터에서 진행을 볼 수 있어요.',
    },
  },
  guide: {
    spotGood: '좋은 자리예요! 여기에 자판기를 놓으세요.',
    placeKey: '설치',
    spotQuiet: '여기는 사람이 적어요. 이걸 내리고 더 붐비는 거리를 찾아보세요.',
    sign: '아래로 스크롤해서 선을 따라 손가락을 밀어 서명하세요.',
    fill: '채우기를 탭해서 밴에서 간식을 실으세요.',
    restock: '이제 채우기를 누르세요. 가장 가까운 창고에서 밴이 가져와요.',
    onTheWay: '밴이 가고 있어요. 이 창을 닫고 오는 걸 지켜보세요.',
    wait: '준비 끝! 닫고 손님이 오는 걸 지켜보세요.',
    collect: '수금을 탭해서 동전을 꺼내세요.',
  },
  tips: {
    keys: {
      title: '열쇠 꾸러미',
      line: '가진 자판기가 모두 여기 있어요. 탭하면 그곳으로 날아가요.',
    },
    routes: {
      title: '밴과 기사',
      line: '큰 밴은 한 번에 더 많이 보충해요. 나중엔 기사가 대신 돌아요.',
    },
    orders: {
      title: '오늘의 주문',
      line: '하루 세 가지 작은 일로 보너스를 받아요. 셋 다 끝내면 연속 기록이 쌓여요.',
    },
    company: {
      title: '내 회사',
      line: '챕터 목표, 들어오고 나가는 돈, 모든 자판기의 업그레이드.',
    },
    rankings: {
      title: '최고 운영자',
      line: '도시의 다른 자판기 회사와 매출을 비교해 보세요.',
    },
  },
  ok: '확인',
  a11y: {
    gotIt: '알겠어요',
    close: '튜토리얼 닫기',
    step: '{total}단계 중 {n}단계',
  },
} satisfies Shape<typeof en>;
