// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// 3D models and gzip'd data packs ship as assets.
config.resolver.assetExts.push('glb', 'gltf', 'bin', 'gz');

// One three.js for everything. R3F's native bundle `require`s three, which resolves to
// three.cjs. Since r18x that file calls `process.emitWarning` at load (a Node API React
// Native doesn't have), so every screen importing the 3D scene failed to load. It would
// also be a second copy of three next to the ESM build our code imports.
// require.resolve('three') is build/three.cjs; the ESM build sits next to it.
const threeModule = path.join(path.dirname(require.resolve('three')), 'three.module.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') return { type: 'sourceFile', filePath: threeModule };
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
