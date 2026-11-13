(() => {
  'use strict';

  const INSTANCE = '__WMS_ASN_MI_AUDIT_V3__';
  if (window[INSTANCE]?.destroy) window[INSTANCE].destroy();
  const STORAGE = '__wms_asn_mi_ui_v3__';
  const API = '/api/v2/apps/';
  const PAGE_SIZE = 20;
  const MAX_PAGES = 500;
  const PARALLEL_SKUS = 3;
  const PARALLEL_MIS = 2;
  const PARALLEL_MTBS = 4;
  const TABLE_PAGE_SIZE = 75;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORAGE) || '{}') || {}; } catch { return {}; } })();
  const state = {
    open: saved.open !== false,
    bubble: saved.bubble || null,
    panel: saved.panel || null,
    running: false,
    controller: null,
    phase: 'Pronto para consultar',
    query: '',
    progressDone: 0,
    progressTotal: 0,
    skus: new Map(),
    skuLookupErrors: new Map(),
    miSkus: new Map(),
    results: [],
    totalMIs: 0,
    auditedMIs: 0,
    totalMTBs: 0,
    auditedMTBs: 0,
    failedMTBs: 0,
    withMTB: true,
    filter: '',
    onlyIssues: false,
    page: 1,
    renderTimer: 0,
    canceled: false,
    runSeq: 0,
    extra: false,
    locationFilter: false
  };

  const host = document.createElement('div');
  host.id = 'wms-asn-mi-audit-host';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host{all:initial;color-scheme:light}
      *{box-sizing:border-box}
      button,input{font:inherit}
      button{cursor:pointer}
      .bubble{position:fixed;z-index:2;width:70px;height:70px;border:2px solid #fff7;box-shadow:0 8px 36px #dc59005f,0 0 0 5px #f07b1730;background:radial-gradient(circle at 28% 23%,#ffba6c,#f37800 45%,#be4200 100%);border-radius:50%;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;font:800 20px Arial,sans-serif;letter-spacing:.5px;touch-action:none;user-select:none;pointer-events:auto}
      .bubble small{font:700 9px Arial,sans-serif;letter-spacing:1.2px}
      .bubble::after{content:'';position:absolute;inset:7px;border:1px dashed #ffffff6b;border-radius:50%;pointer-events:none}
      .bubble[hidden],.panel[hidden]{display:none!important}
      .panel{position:fixed;z-index:3;width:min(1190px,calc(100vw - 24px));height:min(760px,calc(100vh - 24px));min-height:min(440px,calc(100vh - 24px));max-height:calc(100vh - 24px);border-radius:16px;overflow:hidden;background:#f6f8fb;border:1px solid #e9a04c;box-shadow:0 26px 85px #10233f88;display:flex;flex-direction:column;pointer-events:auto;font:12px Arial,Helvetica,sans-serif;color:#263445}
      .head{background:radial-gradient(circle at 90% 35%,#ffffff29 1.8px,transparent 3px) 0 0/21px 21px,linear-gradient(105deg,#e35400,#ff942a);color:white;padding:13px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:move;touch-action:none;user-select:none}
      .head h2{font-size:17px;line-height:1.2;margin:0;font-weight:800}
      .head p{font-size:11px;margin:5px 0 0;opacity:.92}
      .head .minimize{min-width:39px;height:35px;border:1px solid #ffffffaa;color:white;border-radius:9px;background:#ffffff25;font-size:24px;cursor:pointer;line-height:1}
      .toolbar{background:white;padding:11px 14px;border-bottom:1px solid #dfe6f0;display:flex;gap:8px;flex-wrap:wrap;align-items:end}
      .field{display:flex;flex-direction:column;gap:4px;min-width:165px;flex:1}
      .field.asn{flex:1.5;min-width:230px}
      .field label{color:#53657b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.2px}
      input[type=text]{width:100%;height:36px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;padding:0 10px;outline:none;font:12px Consolas,monospace;color:#263445}
      input[type=text]:focus{border-color:#ec7a12;box-shadow:0 0 0 2px #ffa6514c}
      button.action{border:0;border-radius:8px;padding:0 11px;min-height:36px;color:white;background:#34445a;font-size:11px;font-weight:800;white-space:nowrap}
      button.action.primary{background:#ef7508}
      button.action.soft{background:#e9eff5;color:#37485c}
      button.action:disabled{opacity:.4;cursor:not-allowed}
      .options{display:flex;align-items:center;gap:15px;flex-wrap:wrap;padding:8px 15px 4px;color:#52667c;background:#fff}
      .options label,.filter-row label{display:flex;align-items:center;gap:6px;cursor:pointer}
      input[type=checkbox]{accent-color:#f17605}
      .stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;padding:11px 14px}
      .stat{background:#fff;border:1px solid #e3e9f0;border-radius:8px;padding:9px 8px;min-width:0}
      .stat span{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;color:#65778b}
      .stat strong{font-size:18px;display:block;margin-top:5px;font-variant-numeric:tabular-nums}
      .stat.hot strong{color:#d9640a}
      .filter-row{padding:0 14px 9px;display:flex;align-items:center;gap:9px;flex-wrap:wrap}
      .filter-row input[type=text]{flex:1;max-width:430px;min-width:180px}
      .status{padding:1px 14px 7px;display:flex;justify-content:space-between;gap:9px;align-items:center;color:#5c6d81;line-height:1.3;flex-wrap:wrap;font-size:11px}
      .progress{height:5px;background:#dfe7ef;margin:0 14px 9px;border-radius:8px;overflow:hidden}
      .bar{width:0%;height:100%;background:linear-gradient(90deg,#ea6a06,#ffb35e);transition:width .2s}
      .scroll{overflow:auto;flex:1;margin:0 14px 8px;border:1px solid #dbe4ee;border-radius:9px;background:#fff;min-height:100px}
      table{width:100%;border-collapse:collapse;font-size:11px;white-space:nowrap}
      th{position:sticky;top:0;background:#edf2f8;color:#52657b;text-align:left;z-index:1;padding:10px 8px}
      td{border-top:1px solid #edf1f5;padding:8px;vertical-align:middle;font-variant-numeric:tabular-nums}
      td.name{max-width:235px;overflow:hidden;text-overflow:ellipsis}
      td.device{max-width:170px;overflow:hidden;text-overflow:ellipsis}
      td.diff{font-weight:800;color:#cf5b00}
      tr.warn{background:#fff6e9}
      tr.bad{background:#fff0f1}
      .status-pill{font-weight:800;color:#4f6173}
      tr.warn .status-pill{color:#ca5700}
      tr.bad .status-pill{color:#b93948}
      .pager{padding:2px 14px 7px;display:flex;justify-content:flex-end;align-items:center;gap:10px;font-size:11px;color:#5b6f82}
      .pager .action{min-height:27px;padding:0 8px}
      .foot{padding:0 14px 12px;color:#768598;font-size:10px;line-height:1.35}
      @media(max-width:960px){.stats{grid-template-columns:repeat(3,minmax(0,1fr))}.toolbar{gap:6px}.panel{height:calc(100vh - 24px)}}
      @media(max-width:560px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.head h2{font-size:14px}}
    </style>
    <button class="bubble" id="bubble" title="Arraste para mover · Clique para abrir"><span>MI</span><small>ASN BOT</small></button>
    <section class="panel" id="panel">
      <div class="head" id="draghead"><div><h2>WMS · Auditoria ASN / MI / MTB</h2><p>SKUs da ASN → MIs → MTBs e devices → Received × Putaway</p></div><button class="minimize" id="minimize" type="button" title="Minimizar para a bolha">−</button></div>
      <div class="toolbar">
        <div class="field asn"><label for="asn">ASN de origem ou MI direta</label><input id="asn" type="text" spellcheck="false" autocomplete="off" placeholder="INBRFRC12609180161 ou MIBRFSP12609300420"></div>
        <div class="field"><label for="location">Localização MI (opcional)</label><input id="location" type="text" spellcheck="false" autocomplete="off" value="BRFSP1-MI-01-01-1-01"></div>
        <button class="action primary" id="run" type="button">Consultar ASN</button>
        <button class="action soft" id="cancel" type="button" disabled>Parar</button>
        <button class="action" id="csv" type="button" disabled>Exportar CSV</button>
        <button class="action soft" id="copy" type="button" disabled>Copiar divergências</button>
      </div>
      <div class="options">
        <label title="Desmarcado consulta todas as localizações do mapa da ASN"><input id="onlymi" type="checkbox"> Filtrar apenas pela localização MI informada</label>
        <label title="Inclui SKUs encontradas no detalhe da MI ou nas MTBs que não apareçam no mapa de origem"><input id="extras" type="checkbox"> Incluir outras SKUs das MIs / MTBs</label>
        <label title="Consulta todas as MTBs da MI e suas SKUs. Pode demorar em MIs com muitas MTBs."><input id="withmtb" type="checkbox" checked> Consultar MTBs (quantidade por SKU)</label>
      </div>
      <div class="stats">
        <div class="stat"><span>SKUs da ASN</span><strong id="stat-sku">0</strong></div>
        <div class="stat"><span>MIs encontradas</span><strong id="stat-mi">0</strong></div>
        <div class="stat"><span>MIs analisadas</span><strong id="stat-done">0</strong></div>
        <div class="stat"><span>MTBs encontradas</span><strong id="stat-mtb">0</strong></div>
        <div class="stat"><span>MTBs consultadas</span><strong id="stat-mtb-done">0</strong></div>
        <div class="stat"><span>Linhas MI + SKU</span><strong id="stat-lines">0</strong></div>
        <div class="stat hot"><span>Divergências</span><strong id="stat-div">0</strong></div>
        <div class="stat hot"><span>Falta armazenar</span><strong id="stat-need">0</strong></div>
        <div class="stat"><span>Putaway a maior</span><strong id="stat-extra">0</strong></div>
        <div class="stat"><span>Falhas / alertas</span><strong id="stat-err">0</strong></div>
      </div>
      <div class="filter-row"><input id="search" type="text" placeholder="Filtrar MI, SKU, produto, MTB, device ou status"><label><input id="onlyissues" type="checkbox"> Somente divergências / alertas</label><span id="visible">0 linhas</span></div>
      <div class="status"><span id="status">Informe uma ASN de origem e clique em consultar.</span><span id="step"></span></div>
      <div class="progress"><div id="bar" class="bar"></div></div>
      <div class="scroll"><table><thead><tr><th>ASN origem</th><th>SKU</th><th>Produto</th><th>Qtd. no mapa</th><th>MI</th><th>Received Qty</th><th>Putaway Qty</th><th>Diferença</th><th>Qtd. nas MTBs</th><th>MTBs vinculadas</th><th>Devices da MI</th><th>Situação</th></tr></thead><tbody id="rows"></tbody></table></div>
      <div class="pager"><button id="prev" class="action soft">Anterior</button><span id="pages">1 / 1</span><button id="next" class="action soft">Próxima</button></div>
      <div class="foot">Leitura apenas. Diferença = Received − Putaway em cada MI/SKU. "Qtd. mapa" e "Qtd. MTBs" são informativas, nunca somadas ao Received ou ao Putaway. Consulta de MTBs: search_asn_mtb_list → search_mtb_sku_list, com todas as páginas. MIs automáticas vêm das tarefas em andamento e podem não incluir finalizadas. Device vazio não significa estoque zero.</div>
    </section>`;
  document.body.appendChild(host);
  const $ = selector => shadow.querySelector(selector);
  const panel = $('#panel');
  const bubble = $('#bubble');
  const input = $('#asn');
  const locationInput = $('#location');
  const body = $('#rows');
  const runButton = $('#run');
  const cancelButton = $('#cancel');
  const numberText = n => Number(n || 0).toLocaleString('pt-BR');
  const clean = x => String(x === null || x === undefined ? '' : x).trim();
  const skuKey = x => clean(x).toUpperCase();
  const validNumber = x => {
    if (x === null || x === undefined || x === '') return null;
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  };
  const countKind = x => x === 'FALTA' || x === 'A MAIS';
  const errorKind = x => ['ERRO', 'SEM MI', 'NÃO CONSTA', 'SEM SKU'].includes(x);
  let destroyed = false;

  function save() {
    try { localStorage.setItem(STORAGE, JSON.stringify({ open: state.open, panel: state.panel, bubble: state.bubble })); } catch {}
  }

  function setPosition(el, key, fallback) {
    const rect = el.getBoundingClientRect();
    const p = state[key] || fallback();
    const w = rect.width || (key === 'bubble' ? 70 : 900);
    const h = rect.height || (key === 'bubble' ? 70 : 720);
    const x = Math.max(8, Math.min(Math.max(8, window.innerWidth - w - 8), Number(p.x) || 8));
    const y = Math.max(8, Math.min(Math.max(8, window.innerHeight - h - 8), Number(p.y) || 8));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    state[key] = { x, y };
  }

  function redrawPositions() {
    setPosition(bubble, 'bubble', () => ({ x: window.innerWidth - 85, y: window.innerHeight - 85 }));
    setPosition(panel, 'panel', () => ({ x: (window.innerWidth - panel.offsetWidth) / 2, y: 24 }));
  }

  function setOpen(value) {
    state.open = !!value;
    panel.hidden = !state.open;
    bubble.hidden = state.open;
    redrawPositions();
    save();
  }

  function attachDrag(handle, target, key, clickAction) {
    let start = null;
    let skipClick = false;
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button') && handle !== bubble) return;
      start = { id: event.pointerId, x: event.clientX, y: event.clientY, left: target.offsetLeft, top: target.offsetTop, moved: false };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!start || event.pointerId !== start.id) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) < 5) return;
      start.moved = true;
      target.style.left = Math.max(8, Math.min(window.innerWidth - target.offsetWidth - 8, start.left + dx)) + 'px';
      target.style.top = Math.max(8, Math.min(window.innerHeight - target.offsetHeight - 8, start.top + dy)) + 'px';
    });
    const finish = event => {
      if (!start || event.pointerId !== start.id) return;
      const moved = start.moved;
      state[key] = { x: target.offsetLeft, y: target.offsetTop };
      start = null;
      save();
      if (moved) { skipClick = true; return; }
      if (clickAction) clickAction();
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', () => { start = null; });
    if (clickAction) {
      handle.addEventListener('click', event => {
        if (event.detail === 0) clickAction();
        if (skipClick) { event.preventDefault(); skipClick = false; }
      });
    }
  }

  function status(message) { state.phase = message; $('#status').textContent = message; }
  function progress(done, total) {
    state.progressDone = done;
    state.progressTotal = total;
    $('#step').textContent = total ? numberText(done) + ' / ' + numberText(total) : '';
    $('#bar').style.width = (total ? Math.min(100, done * 100 / total) : 0) + '%';
  }

  function abortError() { return new DOMException('Cancelado', 'AbortError'); }
  async function request(path, signal) {
    let last;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal.aborted) throw abortError();
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      signal.addEventListener('abort', onAbort, { once: true });
      const timeout = setTimeout(() => controller.abort(), 22000);
      try {
        const response = await fetch(path, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const json = await response.json();
        if (!json || json.retcode !== 0) throw new Error('WMS: ' + clean(json?.message || 'Retcode ' + json?.retcode));
        if (!json.data || typeof json.data !== 'object') throw new Error('Resposta sem data');
        return json.data;
      } catch (e) {
        if (signal.aborted) throw abortError();
        last = e;
        if (/HTTP (401|403)/.test(clean(e.message))) break;
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', onAbort);
      }
      if (attempt < 2) await sleep(350 * (attempt + 1));
    }
    throw last || new Error('Falha de comunicação');
  }

  async function pages(build, signal, tag, limit = MAX_PAGES) {
    const result = [];
    let total = null;
    for (let page = 1; page <= limit; page++) {
      if (signal.aborted) throw abortError();
      const data = await request(build(page), signal);
      if (!Array.isArray(data.list)) throw new Error(tag + ': resposta sem list');
      if (page === 1 && validNumber(data.total) !== null) total = validNumber(data.total);
      result.push(...data.list);
      if (!data.list.length) {
        if (total !== null && total > result.length) throw new Error(tag + ': retorno incompleto (' + result.length + '/' + total + ')');
        return result;
      }
      if (total !== null && total > 0 && result.length >= total) return result;
      if (data.list.length < PAGE_SIZE) {
        if (total !== null && total > result.length) throw new Error(tag + ': retorno incompleto (' + result.length + '/' + total + ')');
        return result;
      }
      if (page === limit) throw new Error(tag + ': limite de páginas atingido; dados incompletos');
    }
    return result;
  }

  async function pool(items, parallel, task) {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(parallel, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        await task(items[index], index);
      }
    }));
  }

  function mapURL(asn, location, page) {
    const q = new URLSearchParams({ inbound_id: asn, count: String(PAGE_SIZE), pageno: String(page) });
    if (location) q.set('location_id', location);
    return API + 'process/inventory/inventorymap/search_expiry_map?' + q;
  }
  function ongoingURL(sku, page) {
    const q = new URLSearchParams({ scan_code: sku, task_type_list: '303', pageno: String(page), count: String(PAGE_SIZE), sku_id: sku });
    return API + 'querycenter/get_ongoing_task?' + q;
  }
  function miURL(mi, part, page) {
    const q = new URLSearchParams({ inbound_id: mi, pageno: String(page), count: String(PAGE_SIZE) });
    return API + 'process/inbound/mtiasn/' + part + '?' + q;
  }
  function mtbSKUURL(mi, mtb, page) {
    const q = new URLSearchParams({ inbound_id: mi, mtb, pageno: String(page), count: String(PAGE_SIZE) });
    return API + 'process/inbound/mtiasn/search_mtb_sku_list?' + q;
  }

  function gatherSkus(asn, rows) {
    const grouped = new Map();
    for (const item of rows) {
      const sku = skuKey(item?.sku_id);
      if (!sku) continue;
      if (!grouped.has(sku)) grouped.set(sku, { sku, name: clean(item?.sku_name), source: asn, mapQty: 0, invalidMapQty: false, positions: new Set() });
      const g = grouped.get(sku);
      if (!g.name) g.name = clean(item?.sku_name);
      const qty = validNumber(item?.quantity);
      if (qty === null) g.invalidMapQty = true;
      else g.mapQty += qty;
      if (item?.location_id) g.positions.add(clean(item.location_id));
    }
    for (const g of grouped.values()) if (g.invalidMapQty) g.mapQty = null;
    return grouped;
  }

  function aggregateMI(rows) {
    const grouped = new Map();
    for (const raw of rows) {
      const sku = skuKey(raw?.sku_id);
      if (!sku) continue;
      let item = grouped.get(sku);
      if (!item) {
        item = { sku, name: clean(raw?.sku_name), recv: 0, put: 0, invalid: new Set(), expected: 0 };
        grouped.set(sku, item);
      }
      if (!item.name) item.name = clean(raw?.sku_name);
      for (const [field, target] of [['recv_count', 'recv'], ['putaway_count', 'put'], ['expected_count', 'expected']]) {
        const n = validNumber(raw?.[field]);
        if (n === null) item.invalid.add(field);
        else item[target] += n;
      }
    }
    for (const item of grouped.values()) {
      if (item.invalid.has('recv_count')) item.recv = null;
      if (item.invalid.has('putaway_count')) item.put = null;
    }
    return grouped;
  }

  function includesSku(object, sku, depth = 0) {
    if (depth > 6 || !object || typeof object !== 'object') return false;
    if (Array.isArray(object)) return object.some(part => includesSku(part, sku, depth + 1));
    for (const [key, value] of Object.entries(object)) {
      if (/^(sku_id|skuId|sku_code|skuCode|sku_id_list)$/i.test(key)) {
        if (Array.isArray(value) && value.map(skuKey).includes(sku) || skuKey(value) === sku) return true;
      }
      if (typeof value === 'object' && includesSku(value, sku, depth + 1)) return true;
    }
    return false;
  }

  function hasSkuReference(object, depth = 0) {
    if (depth > 6 || !object || typeof object !== 'object') return false;
    if (Array.isArray(object)) return object.some(part => hasSkuReference(part, depth + 1));
    for (const [key, value] of Object.entries(object)) {
      if (/^(sku_id|skuId|sku_code|skuCode|sku_id_list)$/i.test(key) && value !== null && value !== '') return true;
      if (typeof value === 'object' && hasSkuReference(value, depth + 1)) return true;
    }
    return false;
  }

  function deviceLabel(entry, index) {
    const keys = ['device_id', 'device_no', 'device_code', 'device_sn', 'device_name', 'device_number', 'device', 'device_inbound_id', 'device_tag', 'pallet_no'];
    for (const key of keys) {
      const v = entry?.[key];
      if (typeof v === 'string' || typeof v === 'number') {
        if (clean(v)) return clean(v);
      }
    }
    return 'Device #' + (index + 1);
  }

  function devicesForSku(list, sku) {
    if (!list.length) return { text: 'Sem device', detail: 'A consulta da MI retornou lista vazia' };
    const linked = list.filter(entry => includesSku(entry, sku));
    if (linked.length) {
      const names = [...new Set(linked.map((entry, index) => deviceLabel(entry, index)))];
      return { text: names.length > 4 ? names.slice(0, 4).join(', ') + ' (+' + (names.length - 4) + ')' : names.join(', '), detail: names.join(' | ') };
    }
    const refs = list.some(hasSkuReference);
    if (refs) return { text: 'Sem vínculo com a SKU', detail: list.length + ' devices da MI, nenhuma vinculada à SKU' };
    const labels = [...new Set(list.map(deviceLabel))];
    return { text: list.length + ' device(s) da MI*', detail: 'Sem campo SKU no retorno; devices da MI: ' + labels.join(' | ') };
  }

  async function auditMTBs(mi, signal) {
    const mtbs = await pages(page => miURL(mi, 'search_asn_mtb_list', page), signal, 'Lista de MTBs da ' + mi);
    const unique = new Map();
    for (const item of mtbs) {
      const code = skuKey(item?.mtb);
      if (code && !unique.has(code)) unique.set(code, item);
    }
    const codes = [...unique.keys()];
    state.totalMTBs += codes.length;
    scheduleRender();
    const bySku = new Map();
    const errors = [];
    await pool(codes, PARALLEL_MTBS, async mtb => {
      if (signal.aborted) return;
      try {
        const skus = await pages(page => mtbSKUURL(mi, mtb, page), signal, 'SKUs da MTB ' + mtb);
        for (const raw of skus) {
          const sku = skuKey(raw?.sku_id);
          if (!sku) continue;
          if (!bySku.has(sku)) bySku.set(sku, { qty: 0, valid: true, mtbs: new Map() });
          const entry = bySku.get(sku);
          const qty = validNumber(raw?.quantity);
          if (qty === null) entry.valid = false;
          else entry.qty += qty;
          const previous = entry.mtbs.get(mtb);
          entry.mtbs.set(mtb, qty === null || previous === null ? null : (previous || 0) + qty);
        }
      } catch (error) {
        if (signal.aborted) return;
        errors.push(mtb + ': ' + clean(error.message || error));
        state.failedMTBs++;
      } finally {
        state.auditedMTBs++;
        scheduleRender();
      }
    });
    if (signal.aborted) throw abortError();
    return { bySku, count: codes.length, errors, complete: !errors.length };
  }

  function mtbForSku(audit, sku) {
    if (!state.withMTB) return { qty: null, text: 'Desativado', detail: 'Consulta das MTBs desativada', warning: '' };
    if (audit.error) return { qty: null, text: 'Falha MTBs', detail: audit.error, warning: audit.error };
    if (!audit.count) return { qty: null, text: 'Sem MTB', detail: 'A MI não retornou MTBs', warning: '' };
    const found = audit.bySku.get(sku);
    const names = found ? [...found.mtbs.entries()].map(([code, qty]) => code + ' (' + (qty === null ? '?' : qty) + ')') : [];
    const missing = !found && audit.complete;
    const warning = !audit.complete ? 'MTBs com falha: ' + audit.errors.slice(0, 5).join(' | ') + (audit.errors.length > 5 ? ' (e mais ' + (audit.errors.length - 5) + ')' : '') : found && !found.valid ? 'Quantidade inválida em MTB' : '';
    const qty = audit.complete && found?.valid ? found.qty : missing ? 0 : null;
    return {
      qty,
      text: names.length ? (names.length > 3 ? names.slice(0, 3).join(', ') + ' (+' + (names.length - 3) + ')' : names.join(', ')) : missing ? 'SKU não consta' : 'Não confirmado',
      detail: names.length ? names.join(' | ') : (missing ? 'SKU não presente em nenhuma MTB consultada da MI' : 'Dados incompletos'),
      warning,
      partialQty: found?.qty ?? null,
      complete: audit.complete && (found?.valid !== false)
    };
  }

  function buildRow(origin, sku, name, mapQty, mi, item, device, mtb, note = '') {
    const recv = item?.recv ?? null;
    const put = item?.put ?? null;
    const diff = recv !== null && put !== null ? recv - put : null;
    let kind = item ? (diff === null ? 'ERRO' : diff > 0 ? 'FALTA' : diff < 0 ? 'A MAIS' : 'OK') : 'NÃO CONSTA';
    if (note) kind = 'ERRO';
    const warning = item && item.invalid?.size ? 'Campos inválidos: ' + [...item.invalid].join(', ') : '';
    return {
      origin, sku, name, mapQty, mi, recv, put, diff, kind,
      mtbQty: mtb?.qty ?? null, mtbs: mtb?.text || '—', mtbDetail: mtb?.detail || '',
      mtbWarning: mtb?.warning || '', mtbPartialQty: mtb?.partialQty ?? null,
      devices: device?.text || '—', deviceDetail: device?.detail || '',
      note: [note || warning || (kind === 'FALTA' ? 'Recebido maior que armazenado' : kind === 'A MAIS' ? 'Armazenado maior que recebido' : kind === 'NÃO CONSTA' ? 'SKU não localizada no detalhe da MI' : ''), mtb?.warning || ''].filter(Boolean).join(' | ')
    };
  }

  function issueRow(origin, sku, name, mapQty, mi, kind, note) {
    return { origin, sku, name, mapQty, mi, recv: null, put: null, diff: null, kind,
      mtbQty: null, mtbs: '—', mtbDetail: '', mtbWarning: '', mtbPartialQty: null,
      devices: '—', deviceDetail: '', note };
  }

  async function inspectMI(mi, onlySkus, source, signal) {
    const detailedRequest = pages(page => miURL(mi, 'search_asn_sku', page), signal, 'SKUs da ' + mi);
    const devicesRequest = pages(page => miURL(mi, 'search_asn_device', page), signal, 'Devices da ' + mi, 120)
      .then(list => ({ list, error: '' }))
      .catch(error => { if (signal.aborted) throw error; return { list: [], error: clean(error.message || error) }; });
    const mtbRequest = state.withMTB ? auditMTBs(mi, signal)
      .catch(error => { if (signal.aborted) throw error; return { bySku: new Map(), count: 0, errors: [], complete: false, error: clean(error.message || error) }; })
      : Promise.resolve({ bySku: new Map(), count: 0, errors: [], complete: true });
    const [rows, deviceResult, mtbAudit] = await Promise.all([detailedRequest, devicesRequest, mtbRequest]);
    const detailed = aggregateMI(rows);
    const selected = onlySkus ? [...onlySkus] : [...new Set([...detailed.keys(), ...mtbAudit.bySku.keys()])];
    if (!selected.length) return [issueRow(source || '—', '', '', null, mi, 'SEM SKU', 'MI sem SKUs retornadas no detalhe ou nas MTBs')];
    return selected.map(sku => {
      const original = state.skus.get(sku);
      const item = detailed.get(sku);
      const device = deviceResult.error ? { text: 'Falha na consulta', detail: deviceResult.error } : devicesForSku(deviceResult.list, sku);
      const mtb = mtbForSku(mtbAudit, sku);
      const origin = original?.source || (/^MI[A-Z0-9]+$/.test(source) ? source : 'Fora da ASN');
      const row = buildRow(origin, sku, original?.name || item?.name || '', original?.mapQty ?? null, mi, item, device, mtb);
      if (deviceResult.error) row.note = [row.note, 'Falha em devices: ' + deviceResult.error].filter(Boolean).join(' | ');
      return row;
    });
  }

  function visibleRows() {
    const term = state.filter.toLocaleLowerCase('pt-BR');
    const rank = { FALTA: 0, 'A MAIS': 1, ERRO: 2, 'NÃO CONSTA': 3, 'SEM MI': 4, 'SEM SKU': 5, OK: 6 };
    return state.results.filter(row => {
      if (state.onlyIssues && row.kind === 'OK') return false;
      if (!term) return true;
      return [row.origin, row.sku, row.name, row.mi, row.mtbs, row.devices, row.kind, row.note].join(' ').toLocaleLowerCase('pt-BR').includes(term);
    }).sort((a, b) => (rank[a.kind] ?? 10) - (rank[b.kind] ?? 10) || Math.abs(b.diff || 0) - Math.abs(a.diff || 0) || a.mi.localeCompare(b.mi) || a.sku.localeCompare(b.sku));
  }

  function addCell(tr, value, cls = '', title = '') {
    const td = document.createElement('td');
    td.textContent = value === null || value === undefined || value === '' ? '—' : clean(value);
    if (cls) td.className = cls;
    if (title) td.title = title;
    tr.appendChild(td);
  }

  function render() {
    if (destroyed) return;
    const issueRows = state.results.filter(row => countKind(row.kind));
    const errors = state.results.filter(row => errorKind(row.kind) || row.mtbWarning || row.note?.includes('Falha em devices'));
    $('#stat-sku').textContent = numberText(state.skus.size);
    $('#stat-mi').textContent = numberText(state.totalMIs);
    $('#stat-done').textContent = numberText(state.auditedMIs);
    $('#stat-mtb').textContent = numberText(state.totalMTBs);
    $('#stat-mtb-done').textContent = numberText(state.auditedMTBs);
    $('#stat-lines').textContent = numberText(state.results.filter(row => row.sku && row.mi !== '—').length);
    $('#stat-div').textContent = numberText(issueRows.length);
    $('#stat-need').textContent = numberText(issueRows.reduce((sum, row) => sum + Math.max(0, row.diff || 0), 0));
    $('#stat-extra').textContent = numberText(issueRows.reduce((sum, row) => sum + Math.max(0, -(row.diff || 0)), 0));
    $('#stat-err').textContent = numberText(errors.length);
    input.disabled = state.running;
    locationInput.disabled = state.running;
    $('#onlymi').disabled = state.running;
    $('#extras').disabled = state.running;
    $('#withmtb').disabled = state.running;
    runButton.disabled = state.running;
    cancelButton.disabled = !state.running;
    $('#csv').disabled = !state.results.length;
    $('#copy').disabled = !issueRows.length;
    const rows = visibleRows();
    const totalPages = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
    state.page = Math.min(Math.max(state.page, 1), totalPages);
    $('#prev').disabled = state.page <= 1;
    $('#next').disabled = state.page >= totalPages;
    $('#pages').textContent = state.page + ' / ' + totalPages;
    $('#visible').textContent = numberText(rows.length) + ' de ' + numberText(state.results.length) + ' linhas';
    const fragment = document.createDocumentFragment();
    for (const row of rows.slice((state.page - 1) * TABLE_PAGE_SIZE, state.page * TABLE_PAGE_SIZE)) {
      const tr = document.createElement('tr');
      if (countKind(row.kind)) tr.className = 'warn';
      if (errorKind(row.kind)) tr.className = 'bad';
      addCell(tr, row.origin);
      addCell(tr, row.sku);
      addCell(tr, row.name, 'name', row.name);
      addCell(tr, row.mapQty);
      addCell(tr, row.mi);
      addCell(tr, row.recv);
      addCell(tr, row.put);
      addCell(tr, row.diff === null ? null : (row.diff > 0 ? '+' : '') + row.diff, 'diff');
      addCell(tr, row.mtbQty === null && row.mtbPartialQty !== null ? 'Parcial: ' + row.mtbPartialQty : row.mtbQty, '', row.mtbWarning);
      addCell(tr, row.mtbs, 'device', row.mtbDetail);
      addCell(tr, row.devices, 'device', row.deviceDetail);
      addCell(tr, row.kind, 'status-pill', row.note);
      fragment.appendChild(tr);
    }
    if (!fragment.childNodes.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 12;
      td.style.cssText = 'padding:22px;text-align:center;color:#8592a4';
      td.textContent = state.running ? 'Consultando os dados...' : 'Nenhum resultado disponível para este filtro.';
      tr.appendChild(td);
      fragment.appendChild(tr);
    }
    body.replaceChildren(fragment);
  }

  function scheduleRender() {
    if (state.renderTimer) return;
    state.renderTimer = setTimeout(() => { state.renderTimer = 0; render(); }, 150);
  }

  async function run() {
    if (state.running) return;
    const query = skuKey(input.value);
    if (!query) { status('Informe uma ASN (IN...) ou MI (MI...).'); return; }
    if (!/^IN[A-Z0-9]+$/.test(query) && !/^MI[A-Z0-9]+$/.test(query)) { status('Informe um ID válido começando com IN ou MI.'); return; }
    const directMI = query.startsWith('MI');
    const location = $('#onlymi').checked ? skuKey(locationInput.value) : '';
    if (!directMI && $('#onlymi').checked && !location) { status('Informe a localização MI ou desmarque o filtro.'); return; }
    state.runSeq++;
    const seq = state.runSeq;
    state.controller = new AbortController();
    const signal = state.controller.signal;
    state.running = true;
    state.canceled = false;
    state.query = query;
    state.skus.clear();
    state.skuLookupErrors.clear();
    state.miSkus.clear();
    state.results = [];
    state.totalMIs = 0;
    state.auditedMIs = 0;
    state.totalMTBs = 0;
    state.auditedMTBs = 0;
    state.failedMTBs = 0;
    state.page = 1;
    state.extra = $('#extras').checked;
    state.withMTB = $('#withmtb').checked;
    state.locationFilter = !!location;
    progress(0, 0);
    render();
    try {
      if (directMI) {
        state.totalMIs = 1;
        status('Consultando SKUs, MTBs e devices da MI ' + query + '...');
        progress(0, 1);
        state.results.push(...await inspectMI(query, null, query, signal));
        state.skus = new Map(state.results.filter(row => row.sku).map(row => [row.sku, { sku: row.sku }]));
        state.auditedMIs = 1;
        progress(1, 1);
      } else {
        status('Etapa 1/3: lendo todas as páginas do mapa da ASN...');
        const sourceRows = await pages(page => mapURL(query, location, page), signal, 'Mapa da ASN ' + query);
        state.skus = gatherSkus(query, sourceRows);
        if (!state.skus.size) {
          status('Nenhuma SKU retornada no mapa da ASN' + (location ? ' para a localização informada.' : '.'));
          return;
        }
        render();
        const skus = [...state.skus.keys()];
        let located = 0;
        status('Etapa 2/3: localizando MIs para ' + numberText(skus.length) + ' SKUs...');
        progress(0, skus.length);
        await pool(skus, PARALLEL_SKUS, async sku => {
          if (signal.aborted) return;
          try {
            const tasks = await pages(page => ongoingURL(sku, page), signal, 'MIs da SKU ' + sku, 250);
            for (const task of tasks) {
              const mi = skuKey(task?.task_id);
              if (!/^MI[A-Z0-9]+$/.test(mi)) continue;
              if (!state.miSkus.has(mi)) state.miSkus.set(mi, new Set());
              state.miSkus.get(mi).add(sku);
            }
          } catch (e) {
            if (signal.aborted) return;
            state.skuLookupErrors.set(sku, clean(e.message || e));
          }
          located++;
          progress(located, skus.length);
          status('Etapa 2/3: ' + numberText(located) + '/' + numberText(skus.length) + ' SKUs consultadas · ' + numberText(state.miSkus.size) + ' MIs distintas');
          scheduleRender();
        });
        if (signal.aborted) throw abortError();
        const matchedSkus = new Set([...state.miSkus.values()].flatMap(set => [...set]));
        for (const sku of skus) {
          const s = state.skus.get(sku);
          if (state.skuLookupErrors.has(sku)) state.results.push(issueRow(query, sku, s.name, s.mapQty, '—', 'ERRO', 'Falha na busca de MIs: ' + state.skuLookupErrors.get(sku)));
          else if (!matchedSkus.has(sku)) state.results.push(issueRow(query, sku, s.name, s.mapQty, '—', 'SEM MI', 'Nenhuma MI em andamento localizada para esta SKU'));
        }
        const mis = [...state.miSkus.keys()];
        state.totalMIs = mis.length;
        render();
        if (!mis.length) {
          status('Consulta concluída: ' + numberText(skus.length) + ' SKUs, nenhuma MI em andamento encontrada.');
          return;
        }
        status('Etapa 3/3: conferindo Received, Putaway, MTBs e devices em ' + numberText(mis.length) + ' MIs...');
        progress(0, mis.length);
        await pool(mis, PARALLEL_MIS, async mi => {
          if (signal.aborted) return;
          try {
            const included = state.extra ? null : state.miSkus.get(mi);
            state.results.push(...await inspectMI(mi, included, query, signal));
          } catch (e) {
            if (signal.aborted) return;
            for (const sku of state.miSkus.get(mi) || []) {
              const s = state.skus.get(sku);
              state.results.push(issueRow(query, sku, s?.name || '', s?.mapQty ?? null, mi, 'ERRO', 'Falha ao consultar MI: ' + clean(e.message || e)));
            }
          }
          state.auditedMIs++;
          progress(state.auditedMIs, mis.length);
          status('Etapa 3/3: ' + numberText(state.auditedMIs) + '/' + numberText(mis.length) + ' MIs · ' + numberText(state.auditedMTBs) + '/' + numberText(state.totalMTBs) + ' MTBs · ' + numberText(state.results.length) + ' linhas');
          scheduleRender();
        });
      }
      if (signal.aborted) throw abortError();
      const divs = state.results.filter(row => countKind(row.kind)).length;
      const failures = state.results.filter(row => errorKind(row.kind) || row.mtbWarning || row.note?.includes('Falha em devices')).length;
      status('Concluído: ' + numberText(state.skus.size) + ' SKUs, ' + numberText(state.auditedMIs) + ' MIs, ' + numberText(state.auditedMTBs) + '/' + numberText(state.totalMTBs) + ' MTBs, ' + numberText(divs) + ' divergências' + (failures ? ' e ' + numberText(failures) + ' alertas.' : '.'));
    } catch (e) {
      if (signal.aborted || e?.name === 'AbortError') status('Consulta interrompida. Resultados parciais preservados.');
      else status('Erro: ' + clean(e.message || e) + (state.results.length ? ' | Resultados parciais preservados.' : ''));
    } finally {
      if (seq !== state.runSeq) return;
      state.running = false;
      if (state.renderTimer) { clearTimeout(state.renderTimer); state.renderTimer = 0; }
      render();
    }
  }

  function csvEscape(value, numeric = false) {
    let s = value === null || value === undefined ? '' : clean(value);
    if (!numeric && /^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function exportCSV() {
    if (!state.results.length) return;
    const header = ['ASN origem', 'SKU', 'Produto', 'Quantidade mapa ASN', 'MI', 'Received Qty', 'Putaway Qty', 'Diferenca', 'Quantidade nas MTBs', 'MTBs associadas', 'Detalhe MTBs', 'Quantidade parcial MTB', 'Devices da MI', 'Detalhe device', 'Situacao', 'Observacao'];
    const lines = [header.map(v => csvEscape(v)).join(';')];
    for (const r of state.results) {
      lines.push([
        csvEscape(r.origin), csvEscape(r.sku), csvEscape(r.name), csvEscape(r.mapQty, true), csvEscape(r.mi),
        csvEscape(r.recv, true), csvEscape(r.put, true), csvEscape(r.diff, true), csvEscape(r.mtbQty, true), csvEscape(r.mtbs), csvEscape(r.mtbDetail), csvEscape(r.mtbPartialQty, true), csvEscape(r.devices), csvEscape(r.deviceDetail), csvEscape(r.kind), csvEscape(r.note)
      ].join(';'));
    }
    const blob = new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'WMS_ASN_MI_' + state.query.replace(/[^A-Z0-9_-]/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function copyDivergences() {
    const rows = state.results.filter(row => countKind(row.kind));
    const data = ['MI\tSKU\tReceived Qty\tPutaway Qty\tDiferença\tQuantidade nas MTBs\tMTBs', ...rows.map(r => [r.mi, r.sku, r.recv, r.put, r.diff, r.mtbQty ?? '', r.mtbs].join('\t'))].join('\n');
    try {
      await navigator.clipboard.writeText(data);
      status('Copiadas ' + rows.length + ' divergências MI + SKU.');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = data;
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      status(ok ? 'Copiadas ' + rows.length + ' divergências.' : 'Não foi possível copiar as divergências.');
    }
  }

  function destroy() {
    destroyed = true;
    if (state.controller) state.controller.abort();
    if (state.renderTimer) clearTimeout(state.renderTimer);
    window.removeEventListener('resize', redrawPositions);
    host.remove();
    if (window[INSTANCE]?.destroy === destroy) delete window[INSTANCE];
  }

  attachDrag(bubble, bubble, 'bubble', () => setOpen(true));
  attachDrag($('#draghead'), panel, 'panel');
  $('#minimize').addEventListener('click', () => setOpen(false));
  runButton.addEventListener('click', run);
  cancelButton.addEventListener('click', () => state.controller?.abort());
  $('#csv').addEventListener('click', exportCSV);
  $('#copy').addEventListener('click', copyDivergences);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
  $('#search').addEventListener('input', e => { state.filter = e.target.value.trim(); state.page = 1; scheduleRender(); });
  $('#onlyissues').addEventListener('change', e => { state.onlyIssues = e.target.checked; state.page = 1; render(); });
  $('#prev').addEventListener('click', () => { state.page--; render(); });
  $('#next').addEventListener('click', () => { state.page++; render(); });
  window.addEventListener('resize', redrawPositions);
  window[INSTANCE] = { destroy, open: () => setOpen(true) };
  setOpen(state.open);
  render();
})();
