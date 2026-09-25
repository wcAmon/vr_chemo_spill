import {defineConfig} from 'vite';
export default defineConfig({base:'./',build:{outDir:'.build',assetsInlineLimit:4000000,rollupOptions:{input:'app.html',output:{inlineDynamicImports:true}},sourcemap:false},optimizeDeps:{exclude:['@babylonjs/havok']}});
