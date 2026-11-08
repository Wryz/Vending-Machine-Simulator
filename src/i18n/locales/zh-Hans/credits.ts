// Machine-drafted zh-Hans translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/credits';

export default {
  title: '致谢',
  subtitle: 'Coinline · 自动售货机模拟器',
  opensHint: '在浏览器中打开',
  rowA11y: '{name}。{license}',
  sections: {
    help: '隐私和帮助',
    data: '数据',
    software: '软件和字体',
  },
  privacy: {
    name: '隐私政策',
    detail: '游戏会发送哪些数据，以及你有哪些选择。',
  },
  support: {
    name: '支持',
    detail: '疑问、问题、恢复购买。',
  },
  open: '打开',
  installId: '安装 ID（用于数据请求）：{id}',
  placesNote: '地点来自开放地图数据。与这些地点无任何关联或背书。',
  brandsNote: '游戏中所有商品和品牌均为虚构。在点位上使用“举报此地点”可隐藏某个场所。',
  madeBy: '由 Coinline 制作。',
  data: {
    osm: '地图数据、地点名称和建筑轮廓。',
    openfreemap: '底图矢量瓦片和地图字体，由 OpenFreeMap 免费托管。',
    openfreemapLicense: '免费公共实例；瓦片来自 OpenStreetMap 数据（ODbL）',
    openmaptiles: '底图使用的矢量瓦片规范。',
    protomaps:
      '地点数据来自 OpenStreetMap，经 Protomaps 全球构建；可选自托管瓦片。计划接入 Overture Maps Places。',
    protomapsLicense: '基于 OpenStreetMap 数据构建（ODbL）',
    populationName: '人口',
    population: '根据 OpenStreetMap 建筑估算。',
    met: '实时天气来自挪威气象研究所（api.met.no），除映射为游戏天气外未作修改。离线时，游戏使用气候常年值。',
    metLicense: 'CC BY 4.0 和 NLOD 2.0',
    naturalEarth: '城市选择器的地球（陆地、国界、地形）与旗帜对应的国家。',
    timeZones: '每座城市的时区，用于真实的当地时间。',
  },
  software: {
    nunito: '字体。',
    maplibre: '地图渲染。',
    three: '3D 特写。',
    h3: '六边形网格。',
    suncalc: '太阳位置，呈现真实日光。',
  },
} satisfies Shape<typeof en>;
