import { TESS_CORE, TESS_JS, TESS_LANG, TESS_WORKER } from './ocr';

const CONFIG = {
  js: TESS_JS,
  core: TESS_CORE,
  worker: TESS_WORKER,
  lang: TESS_LANG,
};

/**
 * Halaman mini yang dijalankan di dalam WebView (Expo Go).
 * Kontrak dengan sisi React Native:
 *  - kirim { type:'ready' } setelah halaman siap
 *  - window.__scan(dataUrlJpeg) memulai pembacaan
 *  - kirim { type:'progress', status, progress } berkala
 *  - kirim { type:'result', text } atau { type:'error', message }
 */
const SCRIPT = [
  'var CFG = ' + JSON.stringify(CONFIG) + ';',
  'function post(m){ try { window.ReactNativeWebView.postMessage(JSON.stringify(m)); } catch (e) {} }',
  'var readyPromise = null;',
  'function loadScript(src){',
  '  return new Promise(function(res, rej){',
  '    if (window.Tesseract) { res(); return; }',
  '    var s = document.createElement("script");',
  '    s.src = src; s.async = true;',
  '    s.onload = function(){ res(); };',
  '    s.onerror = function(){ rej(new Error("Gagal memuat pustaka OCR")); };',
  '    document.head.appendChild(s);',
  '  });',
  '}',
  'function makeWorker(){',
  '  return loadScript(CFG.js).then(function(){',
  '    if (!window.Tesseract) throw new Error("Pustaka OCR tidak tersedia");',
  '    return window.Tesseract.createWorker("ind", 1, {',
  '      workerPath: CFG.worker,',
  '      corePath: CFG.core,',
  '      langPath: CFG.lang,',
  '      logger: function(m){',
  '        if (m && m.status) post({ type: "progress", status: m.status, progress: m.progress || 0 });',
  '      }',
  '    });',
  '  });',
  '}',
  'window.__scan = function(dataUrl){',
  '  if (!dataUrl) { post({ type: "error", message: "Gambar kosong" }); return; }',
  '  post({ type: "progress", status: "menyiapkan mesin", progress: 0.08 });',
  '  if (!readyPromise) readyPromise = makeWorker();',
  '  readyPromise.then(function(w){',
  '    return w.recognize(dataUrl).then(function(r){',
  '      var text = (r && r.data && r.data.text) || "";',
  '      post({ type: "result", text: text });',
  '    });',
  '  }).catch(function(e){',
  '    readyPromise = null;',
  '    post({ type: "error", message: (e && e.message) ? e.message : "OCR gagal" });',
  '  });',
  '};',
  'post({ type: "ready" });',
].join('\n');

export const TESSERACT_HTML = [
  '<!DOCTYPE html>',
  '<html>',
  '<head>',
  '<meta charset="utf-8" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />',
  '<style>',
  'html,body{margin:0;padding:0;background:#fff;color:#0C0C0B;',
  'font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;font-size:12px}',
  '#log{padding:10px;line-height:1.5}',
  '</style>',
  '</head>',
  '<body>',
  '<div id="log">Menyiapkan pembaca struk…</div>',
  '<script>',
  SCRIPT,
  '</' + 'script>',
  '</body>',
  '</html>',
].join('\n');

export default TESSERACT_HTML;
