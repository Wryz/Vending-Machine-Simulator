// Machine-drafted ko translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/credits';

export default {
  title: '크레딧',
  subtitle: 'Coinline · 자판기 시뮬레이터',
  opensHint: '브라우저에서 열려요',
  rowA11y: '{name}. {license}',
  sections: {
    help: '개인정보와 도움말',
    data: '데이터',
    software: '소프트웨어와 글꼴',
  },
  privacy: {
    name: '개인정보 처리방침',
    detail: '게임이 보내는 정보와 선택할 수 있는 항목.',
  },
  support: {
    name: '지원',
    detail: '문의, 문제 해결, 구매 복원.',
  },
  open: '열기',
  installId: '설치 ID (데이터 요청용): {id}',
  placesNote: '장소는 오픈 지도 데이터에서 가져와요. 제휴나 보증과는 무관해요.',
  brandsNote:
    '게임 속 상품과 브랜드는 모두 가상이에요. 자리에서 "이 장소 신고"를 누르면 장소를 숨길 수 있어요.',
  madeBy: 'Coinline 제작.',
  data: {
    osm: '지도 데이터, 장소 이름, 건물 윤곽.',
    openfreemap: '기본 지도 벡터 타일과 지도 글꼴, OpenFreeMap이 무료로 호스팅.',
    openfreemapLicense: '무료 공개 인스턴스; OpenStreetMap 데이터 기반 타일 (ODbL)',
    openmaptiles: '기본 지도에 쓰는 벡터 타일 스키마.',
    protomaps:
      'Protomaps 플래닛 빌드를 통한 OpenStreetMap 장소 데이터; 자체 호스팅 타일 옵션. Overture Maps Places 도입 예정.',
    protomapsLicense: 'OpenStreetMap 데이터로 제작 (ODbL)',
    populationName: '인구',
    population: 'OpenStreetMap 건물 데이터로 추정.',
    met: '노르웨이 기상청(api.met.no)의 실시간 날씨. 게임 날씨로 변환하는 것 외에는 수정하지 않아요. 오프라인일 때는 평년 기후를 써요.',
    metLicense: 'CC BY 4.0 및 NLOD 2.0',
    naturalEarth: '도시 선택 화면의 국기에 쓰는 국가 정보.',
    timeZones: '각 도시의 시간대(실제 현지 시각용).',
  },
  software: {
    nunito: '서체.',
    maplibre: '지도 렌더링.',
    three: '3D 클로즈업.',
    h3: '육각형 그리드.',
    suncalc: '실제 햇빛을 위한 태양 위치.',
  },
} satisfies Shape<typeof en>;
