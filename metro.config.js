// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// 3D models and gzip'd data packs ship as assets.
config.resolver.assetExts.push('glb', 'gltf', 'bin', 'gz');
module.exports = config;
