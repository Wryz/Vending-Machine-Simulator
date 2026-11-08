// Machine-drafted ja translation. Needs a native-speaker review before launch.
import type { Shape } from '../../core';
import type en from '../en/credits';

export default {
  title: 'クレジット',
  subtitle: 'Coinline · 自販機シミュレーター',
  opensHint: 'ブラウザで開きます',
  rowA11y: '{name}。{license}',
  sections: {
    help: 'プライバシーとヘルプ',
    data: 'データ',
    software: 'ソフトウェアとフォント',
  },
  privacy: {
    name: 'プライバシーポリシー',
    detail: 'ゲームが送信する情報と、選べる設定について。',
  },
  support: {
    name: 'サポート',
    detail: 'ご質問、不具合、購入の復元。',
  },
  open: '開く',
  installId: 'インストールID（データ請求用）：{id}',
  placesNote: '場所はオープンな地図データから表示しています。提携や推奨の関係はありません。',
  brandsNote:
    'ゲーム内の商品やブランドはすべて架空です。スポットの「この場所を報告」で設置先を非表示にできます。',
  madeBy: '制作：Coinline',
  data: {
    osm: '地図データ、地名、建物の形状。',
    openfreemap: 'ベースマップのベクタータイルと地図フォント。OpenFreeMapが無料でホスト。',
    openfreemapLicense: '無料の公開インスタンス。OpenStreetMapデータのタイル（ODbL）',
    openmaptiles: 'ベースマップのベクタータイル仕様。',
    protomaps:
      'Protomaps planetビルド経由のOpenStreetMap場所データ。セルフホストのタイルにも対応。Overture Maps Placesを予定。',
    protomapsLicense: 'OpenStreetMapデータから作成（ODbL）',
    populationName: '人口',
    population: 'OpenStreetMapの建物から推定。',
    met: 'ノルウェー気象研究所（api.met.no）のリアルタイム天気。ゲーム内の状態への対応付け以外は変更していません。オフライン時は平年値を使います。',
    metLicense: 'CC BY 4.0 および NLOD 2.0',
    naturalEarth: '都市選択の国旗に使う国の情報。',
    timeZones: '各都市のタイムゾーン（実際の現地時刻のため）。',
  },
  software: {
    nunito: '書体。',
    maplibre: '地図の描画。',
    three: '3Dクローズアップ。',
    h3: '六角形グリッド。',
    suncalc: '実際の日照のための太陽位置。',
  },
} satisfies Shape<typeof en>;
