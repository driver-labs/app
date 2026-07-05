// Generates docs/n8n/news-scenarios-workflow.json from docs/n8n/generation-contract.json.
// The workflow only references credentials by placeholder id; scripts/push-n8n-workflow.mjs
// resolves real credential ids at push time, so no secrets ever live in the repo.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const contractPath = path.join(rootDir, "docs/n8n/generation-contract.json");

if (!existsSync(contractPath)) {
  console.error(
    "Missing docs/n8n/generation-contract.json. Run scripts/seed-scenario-templates.mjs first.",
  );
  process.exit(1);
}

const contract = JSON.parse(readFileSync(contractPath, "utf8"));
const contractLiteral = JSON.stringify(contract);

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://ompcrnwvtdjdwrcoopkh.supabase.co";
const restUrl = `${supabaseUrl.replace(/\/$/, "")}/rest/v1`;

const OPENAI_CRED = { id: "__OPENAI_CRED_ID__", name: "DriverLab OpenAI" };
const SUPABASE_CRED = { id: "__SUPABASE_CRED_ID__", name: "DriverLab Supabase" };

const patternList = contract.patterns.map((p) => p.pattern).join(", ");
const moduleList = Object.keys(contract.modules).join(", ");
const assetIdList = contract.assets.map((a) => a.id).join(", ");
const enums = contract.enums;

// ─────────────────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────────────────

const TRIAGE_SYSTEM = [
  "Eres analista de noticias de tránsito de El Salvador para DriverLab, una app educativa de manejo.",
  'Recibes JSON {"noticias":[{"index":n,"titulo":"...","resumen":"...","fuente":"..."}]}.',
  'Devuelve SOLO JSON válido con esta forma exacta: {"items":[{"index":n,"relevant":true|false,"score":0-10,"facts":"hechos clave observables o inferibles de la noticia","themes":["tema1","tema2"],"pattern":"<pattern>"|null,"mode":"overlay"|"new_simulation"}]}.',
  `pattern debe ser exactamente uno de: ${patternList}.`,
  "relevant=false (y pattern=null) si la noticia NO puede convertirse en una decisión de manejo concreta (política pura, deportes, sucesos sin componente vial).",
  'mode="new_simulation" SOLO si la situación espacial de la noticia no se puede expresar con una plantilla estándar del pattern; en caso de duda usa "overlay".',
  "score alto = noticia más concreta y pedagógicamente útil. Incluye un item por cada noticia recibida.",
].join(" ");

const OVERLAY_ITEM_SCHEMA = [
  '{"index":n,"mode":"overlay","pattern":"<repetir el pattern asignado>","slug":"kebab-corto-descriptivo","title":"máx 70 caracteres","description":"2-3 frases ancladas en la noticia",',
  `"moduleId":"<uno de: ${moduleList}>",`,
  '"objectives":["1 a 3 objetivos de aprendizaje"],"feedback":{"success":"qué hizo bien","failure":"qué salió mal y por qué","hints":["1 a 3 pistas"]},',
  `"legalReferences":[{"jurisdiction":"El Salvador","document":"${contract.legalDocumentDefault}","ruleCategory":"categoría de la regla"}],`,
  '"interaction":{"prompt":"pregunta de decisión en el momento crítico","options":[{"label":"opción","isCorrect":true},{"label":"opción","isCorrect":false},{"label":"opción","isCorrect":false}]},',
  '"difficulty":"basic|intermediate|advanced","estimatedMinutes":3,"tags":["noticia","tema"]}',
].join("");

const NEWSIM_EXTRA = [
  'Los items con mode "new_simulation" llevan además "simulation":{"pattern":"<el mismo pattern>","durationSeconds":10-60,',
  `"world":{"environment":"<${enums.environment.join("|")}>","roadType":"<${enums.roadType.join("|")}>","weather":"<${enums.weather.join("|")}>","timeOfDay":"<${enums.timeOfDay.join("|")}>"},`,
  `"camera":{"mode":"<${enums.cameraMode.join("|")}>","position":[x,y,z],"lookAt":[x,y,z],"fov":30-90},`,
  '"actorsSpec":[{"id":"snake_case_unico","assetId":"<del catálogo>","role":"<rol>","initialPosition":[x,0,z],"initialRotation":[0,ry,0],"scale":[1,1,1],"tags":["..."]}],',
  '"timeline":[{"id":"ev_1","type":"animate_actor","actorId":"<id de actor>","track":"position","keyframes":[{"t":0,"value":[x,0,z]},{"t":8,"value":[x,0,z]}],"interpolation":"linear"}],',
  '"interactionAppearsAt":<segundos>}.',
  "Reglas de simulation: exactamente UN actor con role ego_vehicle; entre 2 y 6 actores; coordenadas en metros con |valor|<=200 e y=0 para vehículos;",
  "keyframes con t ascendente dentro de la duración; entre 1 y 12 eventos animate_actor; NO incluyas eventos trigger (el sistema agrega la interacción en interactionAppearsAt).",
  `Catálogo cerrado — assetIds: ${assetIdList}. Roles: ${enums.actorRole.join(", ")}. Tags de actor: ${enums.actorTag.join(", ")}.`,
].join(" ");

const GENERATE_SYSTEM = [
  "Eres el diseñador pedagógico de DriverLab, app salvadoreña para aprender a conducir con escenarios 3D. Convertís noticias de tránsito reales de El Salvador en escenarios de práctica.",
  'Recibirás JSON {"historias":[{"index":n,"titulo":"...","resumen":"...","hechos":"...","pattern":"...","mode":"overlay"|"new_simulation"}]}.',
  'Devolvé SOLO JSON válido: {"items":[...]} con un elemento por historia (omití las historias imposibles de convertir).',
  "TODO el texto en español de El Salvador, tono educativo, sin nombres reales de personas. Basate en la noticia; cuando falten detalles, inventá detalles plausibles coherentes con El Salvador.",
  `Cada item con mode "overlay" tiene esta forma exacta: ${OVERLAY_ITEM_SCHEMA}.`,
  "Reglas del quiz: EXACTAMENTE una opción con isCorrect true, 3 o 4 opciones en total, labels de 8 a 120 caracteres, todas distintas, la pregunta plantea la decisión en el momento crítico.",
  NEWSIM_EXTRA,
].join(" ");

const TOPUP_SYSTEM = [
  "Eres el diseñador pedagógico de DriverLab (app salvadoreña de manejo).",
  'Recibirás JSON {"temas":[...],"titulares":[...],"generar":N}.',
  `Generá exactamente N escenarios ADICIONALES como variaciones plausibles de esos temas del día en El Salvador. Devolvé SOLO JSON: {"items":[...]} donde cada item usa mode "overlay" con esta forma exacta: ${OVERLAY_ITEM_SCHEMA.replace('"index":n,', "")}`,
  `Usá patterns variados de: ${patternList}.`,
  "EXACTAMENTE una opción isCorrect true por item, 3-4 opciones, labels 8-120 caracteres distintas. Español salvadoreño, tono educativo.",
].join(" ");

// ─────────────────────────────────────────────────────────────────────────────
// Shared JS injected into Code nodes (plain JS, no template-literal interpolation)
// ─────────────────────────────────────────────────────────────────────────────

const HELPERS = `
const CONTRACT = ${contractLiteral};

function rowsOf(nodeName) {
  let raw = [];
  try { raw = $(nodeName).all().map(function (i) { return i.json; }); } catch (e) { raw = []; }
  const flat = [];
  for (const r of raw) {
    if (Array.isArray(r)) { for (const x of r) flat.push(x); }
    else if (r && Array.isArray(r.data)) { for (const x of r.data) flat.push(x); }
    else if (r && typeof r === 'object' && Object.keys(r).length > 0) flat.push(r);
  }
  return flat;
}

function parseOpenAI(json) {
  try {
    const content = json && json.choices && json.choices[0] && json.choices[0].message
      ? json.choices[0].message.content : null;
    if (!content) return null;
    return JSON.parse(content);
  } catch (e) { return null; }
}

function clampStr(value, max) {
  const s = String(value == null ? '' : value).replace(/\\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1).trim() + '…' : s;
}

function strArray(value, min, max, itemMax) {
  if (!Array.isArray(value)) return null;
  const out = value
    .filter(function (v) { return typeof v === 'string' && v.trim().length > 0; })
    .map(function (v) { return clampStr(v, itemMax); })
    .slice(0, max);
  return out.length >= min ? out : null;
}

function sanitizeSlug(value) {
  const s = String(value == null ? '' : value).toLowerCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return s || 'escenario';
}

function pad2(n) { return String(n).padStart(2, '0'); }

function isVec3(v, maxAbs) {
  return Array.isArray(v) && v.length === 3 && v.every(function (x) {
    return typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= maxAbs;
  });
}

function normalizeRefs(refs) {
  const list = Array.isArray(refs) ? refs : [];
  const out = list
    .filter(function (r) { return r && typeof r === 'object'; })
    .map(function (r) {
      return {
        jurisdiction: clampStr(r.jurisdiction || 'El Salvador', 60) || 'El Salvador',
        document: clampStr(r.document || CONTRACT.legalDocumentDefault, 160) || CONTRACT.legalDocumentDefault,
        ruleCategory: clampStr(r.ruleCategory || 'normas de circulación', 120) || 'normas de circulación',
      };
    })
    .slice(0, 4);
  if (out.length === 0) {
    out.push({
      jurisdiction: 'El Salvador',
      document: CONTRACT.legalDocumentDefault,
      ruleCategory: 'normas de circulación',
    });
  }
  return out;
}

// Final gate: mirrors ScenarioDefinitionSchema + validateScenarioDefinition in
// core/scenario-definition.ts. Bounds are relaxed enough for template data.
function validateDefinition(def) {
  const errors = [];
  const err = function (m) { errors.push(m); };
  if (!def || typeof def !== 'object') return ['definition is not an object'];
  if (def.schemaVersion !== 'drivelab.scenario.v1') err('bad schemaVersion');
  for (const k of ['id', 'slug', 'title', 'description']) {
    if (typeof def[k] !== 'string' || def[k].trim().length === 0) err('missing ' + k);
  }
  const mb = def.moduleBinding || {};
  if (!CONTRACT.modules[mb.moduleId]) err('unknown moduleId ' + mb.moduleId);
  if (mb.isPrimaryScenario !== false) err('isPrimaryScenario must be false');
  const learning = def.learning || {};
  if (!Array.isArray(learning.lessonIds) || learning.lessonIds.length === 0) err('missing lessonIds');
  if (!Array.isArray(learning.objectives) || learning.objectives.length === 0) err('missing objectives');
  const fb = learning.feedback || {};
  if (!fb.success || !fb.failure || !Array.isArray(fb.hints) || fb.hints.length === 0) err('bad feedback');
  const sim = def.simulation || {};
  const known = CONTRACT.patterns.some(function (p) { return p.pattern === sim.pattern; });
  if (!known) err('unknown pattern ' + sim.pattern);
  if (!(typeof sim.durationSeconds === 'number' && sim.durationSeconds > 0 && sim.durationSeconds <= 120)) err('bad durationSeconds');
  const world = sim.world || {};
  for (const k of ['environment', 'roadType', 'weather', 'timeOfDay']) {
    if (typeof world[k] !== 'string' || world[k].length === 0) err('bad world.' + k);
  }
  if (world.units !== 'meters') err('world.units must be meters');
  const cam = sim.camera || {};
  if (CONTRACT.enums.cameraMode.indexOf(cam.mode) === -1) err('bad camera.mode');
  if (!(typeof cam.fov === 'number' && cam.fov > 0 && cam.fov <= 120)) err('bad camera.fov');
  if (!isVec3(cam.position, 1000) || !isVec3(cam.lookAt, 1000)) err('bad camera vectors');
  const assets = Array.isArray(sim.assets) ? sim.assets : [];
  if (assets.length === 0) err('no assets');
  const assetIds = new Set();
  for (const a of assets) {
    if (!a || !a.id || !a.type || !a.url) err('bad asset entry');
    else if (assetIds.has(a.id)) err('duplicate asset id ' + a.id);
    else assetIds.add(a.id);
  }
  const actors = Array.isArray(sim.actors) ? sim.actors : [];
  if (actors.length === 0 || actors.length > 8) err('bad actor count');
  const actorIds = new Set();
  for (const a of actors) {
    if (!a || typeof a.id !== 'string' || a.id.length === 0) { err('bad actor id'); continue; }
    if (actorIds.has(a.id)) err('duplicate actor id ' + a.id);
    actorIds.add(a.id);
    if (!assetIds.has(a.assetId)) err('actor ' + a.id + ' references missing asset ' + a.assetId);
    if (typeof a.role !== 'string' || a.role.length === 0) err('actor ' + a.id + ' missing role');
    if (!isVec3(a.initialPosition, 1000) || !isVec3(a.initialRotation, 1000) || !isVec3(a.scale, 1000)) {
      err('actor ' + a.id + ' has bad vectors');
    }
    if (!Array.isArray(a.tags)) err('actor ' + a.id + ' tags must be array');
  }
  const interactions = Array.isArray(sim.interactions) ? sim.interactions : [];
  if (interactions.length === 0) err('no interactions');
  const interactionIds = new Set(interactions.map(function (i) { return i && i.id; }));
  for (const inter of interactions) {
    if (!inter || inter.type !== 'multiple_choice') { err('bad interaction type'); continue; }
    if (!(typeof inter.appearsAt === 'number' && inter.appearsAt >= 0)) err('bad appearsAt');
    if (typeof inter.prompt !== 'string' || inter.prompt.trim().length === 0) err('missing prompt');
    const opts = Array.isArray(inter.options) ? inter.options : [];
    if (opts.length < 2) err('needs >=2 options');
    const optIds = new Set();
    const labels = new Set();
    let correctCount = 0;
    for (const o of opts) {
      if (!o || typeof o.id !== 'string' || typeof o.label !== 'string' || o.label.trim().length === 0) { err('bad option'); continue; }
      if (optIds.has(o.id)) err('duplicate option id ' + o.id);
      optIds.add(o.id);
      const lkey = o.label.trim().toLowerCase();
      if (labels.has(lkey)) err('duplicate option label');
      labels.add(lkey);
      if (typeof o.scoreDelta !== 'number') err('option missing scoreDelta');
      if (o.isCorrect === true) correctCount += 1;
    }
    if (correctCount !== 1) err('needs exactly one correct option');
    const correct = opts.find(function (o) { return o.id === inter.correctOptionId; });
    if (!correct || correct.isCorrect !== true) err('correctOptionId mismatch');
  }
  const timeline = Array.isArray(sim.timeline) ? sim.timeline : [];
  if (timeline.length === 0) err('no timeline events');
  let hasTrigger = false;
  for (const ev of timeline) {
    if (!ev || typeof ev.id !== 'string') { err('bad timeline event'); continue; }
    if (ev.type === 'animate_actor') {
      if (ev.actorId && !actorIds.has(ev.actorId)) err('timeline event ' + ev.id + ' references missing actor');
      if (ev.keyframes) {
        let prev = -1;
        for (const kf of ev.keyframes) {
          if (!kf || typeof kf.t !== 'number' || kf.t < 0 || !isVec3(kf.value, 1000)) err('bad keyframe in ' + ev.id);
          else { if (kf.t < prev) err('keyframes not ascending in ' + ev.id); prev = kf.t; }
        }
      }
    } else if (ev.type === 'trigger') {
      if (!(ev.trigger && ev.trigger.kind === 'show_interaction' && interactionIds.has(ev.trigger.interactionId))) {
        err('bad trigger event ' + ev.id);
      } else { hasTrigger = true; }
      if (!(typeof ev.at === 'number' && ev.at >= 0)) err('trigger event ' + ev.id + ' missing at');
    } else { err('unknown timeline event type'); }
  }
  if (!hasTrigger) err('no show_interaction trigger');
  const scoring = def.scoring || {};
  if (!(scoring.maxScore > 0 && scoring.passScore > 0 && scoring.passScore <= scoring.maxScore)) err('bad scoring');
  if (!Array.isArray(scoring.metrics) || scoring.metrics.length === 0) err('missing scoring metrics');
  const meta = def.metadata || {};
  if (CONTRACT.enums.difficulty.indexOf(meta.difficulty) === -1) err('bad difficulty');
  if (!(typeof meta.estimatedMinutes === 'number' && meta.estimatedMinutes > 0)) err('bad estimatedMinutes');
  if (!Array.isArray(meta.tags)) err('bad tags');
  if (!meta.createdAt || !meta.updatedAt) err('missing timestamps');
  return errors;
}

// Strict contract checks for LLM-generated simulations (never applied to templates).
function validateCandidateSim(sim) {
  const errors = [];
  const err = function (m) { errors.push(m); };
  const L = CONTRACT.limits;
  if (!sim || typeof sim !== 'object') return ['simulation missing'];
  if (!CONTRACT.patterns.some(function (p) { return p.pattern === sim.pattern; })) err('pattern');
  if (!(typeof sim.durationSeconds === 'number' && sim.durationSeconds >= L.durationSeconds[0] && sim.durationSeconds <= L.durationSeconds[1])) err('durationSeconds');
  const world = sim.world || {};
  if (CONTRACT.enums.environment.indexOf(world.environment) === -1) err('world.environment');
  if (CONTRACT.enums.roadType.indexOf(world.roadType) === -1) err('world.roadType');
  if (CONTRACT.enums.weather.indexOf(world.weather) === -1) err('world.weather');
  if (CONTRACT.enums.timeOfDay.indexOf(world.timeOfDay) === -1) err('world.timeOfDay');
  const cam = sim.camera || {};
  if (CONTRACT.enums.cameraMode.indexOf(cam.mode) === -1) err('camera.mode');
  if (!(typeof cam.fov === 'number' && cam.fov >= L.fov[0] && cam.fov <= L.fov[1])) err('camera.fov');
  if (!isVec3(cam.position, L.maxAbsCoordinate) || !isVec3(cam.lookAt, L.maxAbsCoordinate)) err('camera vectors');
  const specs = Array.isArray(sim.actorsSpec) ? sim.actorsSpec : [];
  if (specs.length < L.actors[0] || specs.length > L.actors[1]) err('actor count');
  const assetById = {};
  for (const a of CONTRACT.assets) assetById[a.id] = a;
  const ids = new Set();
  let egoCount = 0;
  for (const s of specs) {
    if (!s || typeof s.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(s.id)) { err('actor id'); continue; }
    if (ids.has(s.id)) err('duplicate actor id');
    ids.add(s.id);
    if (!assetById[s.assetId]) err('unknown assetId ' + s.assetId);
    if (CONTRACT.enums.actorRole.indexOf(s.role) === -1) err('actor role ' + s.role);
    if (s.role === 'ego_vehicle') egoCount += 1;
    if (!isVec3(s.initialPosition, L.maxAbsCoordinate) || !isVec3(s.initialRotation, 720) || !isVec3(s.scale, 10)) err('actor vectors');
    const tags = Array.isArray(s.tags) ? s.tags : [];
    for (const t of tags) if (CONTRACT.enums.actorTag.indexOf(t) === -1) err('actor tag ' + t);
  }
  if (egoCount !== 1) err('needs exactly one ego_vehicle');
  const timeline = Array.isArray(sim.timeline) ? sim.timeline : [];
  if (timeline.length < L.timelineEvents[0] || timeline.length > L.timelineEvents[1]) err('timeline count');
  const evIds = new Set();
  for (const ev of timeline) {
    if (!ev || typeof ev.id !== 'string' || ev.type !== 'animate_actor') { err('timeline event type'); continue; }
    if (evIds.has(ev.id)) err('duplicate event id');
    evIds.add(ev.id);
    if (!ids.has(ev.actorId)) err('event actorId');
    if (['position', 'rotation', 'scale'].indexOf(ev.track) === -1) err('event track');
    const kfs = Array.isArray(ev.keyframes) ? ev.keyframes : [];
    if (kfs.length < 2) err('needs >=2 keyframes');
    let prev = -1;
    for (const kf of kfs) {
      if (!kf || typeof kf.t !== 'number' || kf.t < 0 || kf.t > sim.durationSeconds || !isVec3(kf.value, L.maxAbsCoordinate)) err('keyframe');
      else { if (kf.t <= prev) err('keyframes not ascending'); prev = kf.t; }
    }
  }
  const at = sim.interactionAppearsAt;
  if (!(typeof at === 'number' && at >= 0 && at <= sim.durationSeconds)) err('interactionAppearsAt');
  return errors;
}

function buildInteractionOptions(llmInteraction) {
  if (!llmInteraction || typeof llmInteraction !== 'object') return null;
  const prompt = clampStr(llmInteraction.prompt, 300);
  if (prompt.length < 10) return null;
  const raw = Array.isArray(llmInteraction.options) ? llmInteraction.options : [];
  const cleaned = [];
  const seenLabels = new Set();
  for (const o of raw) {
    if (!o || typeof o.label !== 'string') continue;
    const label = clampStr(o.label, 160);
    const key = label.toLowerCase();
    if (label.length < 8 || seenLabels.has(key)) continue;
    seenLabels.add(key);
    cleaned.push({ label: label, isCorrect: o.isCorrect === true });
  }
  const correct = cleaned.filter(function (o) { return o.isCorrect; });
  const wrong = cleaned.filter(function (o) { return !o.isCorrect; });
  if (correct.length !== 1 || wrong.length < 1) return null;
  return { prompt: prompt, correct: correct[0], wrong: wrong.slice(0, 3) };
}

function applyCommonFields(def, llm, story, dateStr, seq, mode) {
  const moduleId = CONTRACT.modules[llm.moduleId] ? llm.moduleId : null;
  if (!moduleId) return 'moduleId';
  const slug = sanitizeSlug(llm.slug || llm.title);
  def.schemaVersion = 'drivelab.scenario.v1';
  def.id = 'scenario_news_' + dateStr + '_' + slug + '_' + pad2(seq);
  def.slug = 'news-' + dateStr + '-' + slug + '-' + pad2(seq);
  def.title = clampStr(llm.title, 90);
  def.description = clampStr(llm.description, 400);
  if (def.title.length < 10 || def.description.length < 30) return 'title/description';
  def.moduleBinding = { moduleId: moduleId, isPrimaryScenario: false };
  const objectives = strArray(llm.objectives, 1, 5, 300);
  const fb = llm.feedback || {};
  const hints = strArray(fb.hints, 1, 5, 300);
  const success = clampStr(fb.success, 400);
  const failure = clampStr(fb.failure, 400);
  if (!objectives || !hints || success.length < 10 || failure.length < 10) return 'learning texts';
  def.learning = {
    lessonIds: CONTRACT.modules[moduleId].lessonIds.slice(),
    objectives: objectives,
    feedback: { success: success, failure: failure, hints: hints },
    legalReferences: normalizeRefs(llm.legalReferences),
  };
  const now = new Date().toISOString();
  const minutes = Number(llm.estimatedMinutes);
  def.metadata = {
    difficulty: CONTRACT.enums.difficulty.indexOf(llm.difficulty) === -1 ? 'intermediate' : llm.difficulty,
    estimatedMinutes: Number.isInteger(minutes) && minutes >= CONTRACT.limits.estimatedMinutes[0] && minutes <= CONTRACT.limits.estimatedMinutes[1] ? minutes : 3,
    tags: Array.from(new Set(['noticia'].concat(strArray(llm.tags, 0, 6, 40) || []))),
    createdAt: now,
    updatedAt: now,
  };
  def.scoring = JSON.parse(JSON.stringify(CONTRACT.scoring));
  return null;
}

function buildOverlay(llm, story, template, dateStr, seq) {
  if (!template) return { def: null, reason: 'no template for pattern' };
  const def = JSON.parse(JSON.stringify(template.definition));
  const commonError = applyCommonFields(def, llm, story, dateStr, seq, 'overlay');
  if (commonError) return { def: null, reason: commonError };
  const inter = def.simulation.interactions[0];
  const parsedQuiz = buildInteractionOptions(llm.interaction);
  if (!parsedQuiz) return { def: null, reason: 'interaction' };
  const correctSlot = inter.options.find(function (o) { return o.id === inter.correctOptionId; });
  if (!correctSlot) return { def: null, reason: 'template correct slot' };
  const wrongSlots = inter.options.filter(function (o) { return o.id !== inter.correctOptionId; });
  const rebuilt = [];
  correctSlot.label = parsedQuiz.correct.label;
  correctSlot.isCorrect = true;
  rebuilt.push(correctSlot);
  for (let i = 0; i < wrongSlots.length && i < parsedQuiz.wrong.length; i += 1) {
    wrongSlots[i].label = parsedQuiz.wrong[i].label;
    wrongSlots[i].isCorrect = false;
    rebuilt.push(wrongSlots[i]);
  }
  if (rebuilt.length < 3) return { def: null, reason: 'not enough options' };
  inter.options = rebuilt;
  inter.prompt = parsedQuiz.prompt;
  return { def: def, reason: null };
}

function buildNewSimulation(llm, story, dateStr, seq) {
  const sim = llm.simulation;
  const candidateErrors = validateCandidateSim(sim);
  if (candidateErrors.length > 0) return { def: null, reason: 'candidate: ' + candidateErrors.slice(0, 3).join('; ') };
  const parsedQuiz = buildInteractionOptions(llm.interaction);
  if (!parsedQuiz) return { def: null, reason: 'interaction' };
  const assetById = {};
  for (const a of CONTRACT.assets) assetById[a.id] = a;
  const usedAssetIds = Array.from(new Set(sim.actorsSpec.map(function (s) { return s.assetId; })));
  const assets = usedAssetIds.map(function (id) { return JSON.parse(JSON.stringify(assetById[id])); });
  const actors = sim.actorsSpec.map(function (s) {
    return {
      id: s.id,
      assetId: s.assetId,
      role: s.role,
      initialPosition: s.initialPosition,
      initialRotation: s.initialRotation,
      scale: s.scale,
      tags: Array.isArray(s.tags) ? s.tags : [],
    };
  });
  const options = [{ id: 'opt_1', label: parsedQuiz.correct.label, isCorrect: true, scoreDelta: 100 }];
  parsedQuiz.wrong.forEach(function (o, i) {
    options.push({ id: 'opt_' + (i + 2), label: o.label, isCorrect: false, scoreDelta: -25 });
  });
  const interaction = {
    id: 'interaction_main',
    type: 'multiple_choice',
    appearsAt: sim.interactionAppearsAt,
    prompt: parsedQuiz.prompt,
    options: options,
    correctOptionId: 'opt_1',
  };
  const timeline = sim.timeline.map(function (ev) {
    return {
      id: ev.id,
      type: 'animate_actor',
      actorId: ev.actorId,
      track: ev.track,
      keyframes: ev.keyframes,
      interpolation: ev.interpolation === 'smooth' ? 'smooth' : 'linear',
    };
  });
  timeline.push({
    id: 'ev_show_interaction',
    type: 'trigger',
    at: sim.interactionAppearsAt,
    trigger: { kind: 'show_interaction', interactionId: 'interaction_main' },
  });
  const def = {};
  const commonError = applyCommonFields(def, llm, story, dateStr, seq, 'new_simulation');
  if (commonError) return { def: null, reason: commonError };
  def.simulation = {
    pattern: sim.pattern,
    durationSeconds: sim.durationSeconds,
    world: {
      environment: sim.world.environment,
      roadType: sim.world.roadType,
      weather: sim.world.weather,
      timeOfDay: sim.world.timeOfDay,
      units: 'meters',
    },
    camera: {
      mode: sim.camera.mode,
      position: sim.camera.position,
      lookAt: sim.camera.lookAt,
      fov: sim.camera.fov,
    },
    assets: assets,
    actors: actors,
    timeline: timeline,
    interactions: [interaction],
  };
  return { def: def, reason: null };
}

function templatesByPattern(templateRows) {
  const map = {};
  const sorted = templateRows.slice().sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
  for (const row of sorted) {
    if (row && row.pattern && row.definition && !map[row.pattern]) map[row.pattern] = row;
  }
  return map;
}

function fallbackTemplate(pattern, tplMap) {
  const entry = CONTRACT.patterns.find(function (p) { return p.pattern === pattern; });
  if (!entry) return null;
  return tplMap[entry.fallbackPattern] || tplMap[pattern] || null;
}

function buildScenarioRow(llm, story, tplMap, dateStr, seq) {
  if (!llm || typeof llm !== 'object') return null;
  const pattern = llm.pattern;
  if (!CONTRACT.patterns.some(function (p) { return p.pattern === pattern; })) return null;
  let mode = llm.mode === 'new_simulation' && llm.simulation ? 'new_simulation' : 'overlay';
  let built = null;
  if (mode === 'new_simulation') {
    built = buildNewSimulation(llm, story, dateStr, seq);
    if (!built.def) {
      mode = 'overlay';
      built = buildOverlay(llm, story, fallbackTemplate(pattern, tplMap), dateStr, seq);
    }
  } else {
    built = buildOverlay(llm, story, fallbackTemplate(pattern, tplMap), dateStr, seq);
  }
  if (!built.def) return null;
  const finalErrors = validateDefinition(built.def);
  if (finalErrors.length > 0) return null;
  return {
    id: built.def.id,
    definition: built.def,
    generation_mode: mode,
    news_title: story.news_title,
    news_url: story.news_url,
    news_source: story.news_source,
    news_published_at: story.news_published_at,
    news_summary: story.news_summary,
  };
}

function todayDateStr() {
  const d = new Date();
  return String(d.getUTCFullYear()) + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate());
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// Code node sources
// ─────────────────────────────────────────────────────────────────────────────

const CODE_NORMALIZE = `
const now = Date.now();
const seen = new Set();
const stories = [];
for (const item of $input.all()) {
  const j = item.json || {};
  let title = String(j.title || '').trim();
  const link = String(j.link || '').trim();
  if (!title || !link || !/^https?:/i.test(link)) continue;
  const pub = j.isoDate || j.pubDate || null;
  const pubMs = pub ? Date.parse(pub) : NaN;
  if (Number.isFinite(pubMs) && now - pubMs > 48 * 3600 * 1000) continue;
  let source = String(j.creator || j.author || '').trim();
  const dashIdx = title.lastIndexOf(' - ');
  if (dashIdx > 10) {
    const suffix = title.slice(dashIdx + 3).trim();
    if (!source) source = suffix;
    if (suffix === source) title = title.slice(0, dashIdx).trim();
  }
  if (!source) {
    try { source = new URL(link).hostname.replace(/^www\\./, ''); } catch (e) { source = 'Google News'; }
  }
  const rawSummary = String(j.contentSnippet || j.content || j.description || j.summary || '');
  const summary = rawSummary.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 600);
  const urlKey = link.toLowerCase();
  const titleKey = title.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/g, ' ').trim();
  if (seen.has(urlKey) || (titleKey && seen.has(titleKey))) continue;
  seen.add(urlKey);
  if (titleKey) seen.add(titleKey);
  stories.push({
    news_title: title.slice(0, 300),
    news_url: link,
    news_source: source.slice(0, 120),
    news_published_at: Number.isFinite(pubMs) ? new Date(pubMs).toISOString() : null,
    news_summary: summary || null,
  });
  if (stories.length >= 25) break;
}
return [{ json: { stories: stories } }];
`;

const CODE_PREP_TRIAGE = `${HELPERS}
let stories = [];
try { stories = $('Normalize Stories').first().json.stories || []; } catch (e) { stories = []; }
const seenUrls = new Set(rowsOf('Fetch Seen URLs')
  .map(function (r) { return String(r.news_url || '').toLowerCase(); })
  .filter(Boolean));
const fresh = stories.filter(function (s) { return !seenUrls.has(String(s.news_url).toLowerCase()); });
const body = {
  model: 'gpt-4.1-mini',
  temperature: 0.2,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: ${JSON.stringify(TRIAGE_SYSTEM)} },
    {
      role: 'user',
      content: JSON.stringify({
        noticias: fresh.map(function (s, i) {
          return { index: i, titulo: s.news_title, resumen: s.news_summary || '', fuente: s.news_source };
        }),
      }),
    },
  ],
};
return [{ json: { body: body, fresh: fresh, allStories: stories } }];
`;

const CODE_PREP_GENERATE = `${HELPERS}
const triage = parseOpenAI($input.first().json) || { items: [] };
const prep = $('Prep Triage').first().json;
const fresh = prep.fresh || [];
const allStories = prep.allStories || [];
const patterns = CONTRACT.patterns.map(function (p) { return p.pattern; });
const rated = (Array.isArray(triage.items) ? triage.items : [])
  .filter(function (t) {
    return t && t.relevant === true && typeof t.index === 'number' && fresh[t.index]
      && typeof t.score === 'number' && t.score >= 5 && patterns.indexOf(t.pattern) !== -1;
  })
  .sort(function (a, b) { return b.score - a.score; })
  .slice(0, 15);
const selected = rated.map(function (t) {
  return {
    story: fresh[t.index],
    facts: String(t.facts || ''),
    themes: Array.isArray(t.themes) ? t.themes : [],
    pattern: t.pattern,
    mode: t.mode === 'new_simulation' ? 'new_simulation' : 'overlay',
  };
});
const themes = Array.from(new Set(
  (Array.isArray(triage.items) ? triage.items : [])
    .filter(function (t) { return t && t.relevant === true; })
    .flatMap(function (t) { return Array.isArray(t.themes) ? t.themes : []; })
    .map(function (t) { return String(t).slice(0, 60); }),
)).slice(0, 12);
const body = {
  model: 'gpt-4.1',
  temperature: 0.7,
  max_tokens: 16000,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: ${JSON.stringify(GENERATE_SYSTEM)} },
    {
      role: 'user',
      content: JSON.stringify({
        historias: selected.map(function (s, i) {
          return {
            index: i,
            titulo: s.story.news_title,
            resumen: s.story.news_summary || '',
            hechos: s.facts,
            pattern: s.pattern,
            mode: s.mode,
          };
        }),
      }),
    },
  ],
};
const newsPool = fresh.length > 0 ? fresh : allStories;
return [{ json: { body: body, selected: selected, themes: themes, newsPool: newsPool } }];
`;

const CODE_BUILD_VALIDATE = `${HELPERS}
const gen = parseOpenAI($input.first().json) || { items: [] };
const prep = $('Prep Generate').first().json;
const selected = prep.selected || [];
const tplMap = templatesByPattern(rowsOf('Fetch Templates'));
const dateStr = todayDateStr();
const scenarios = [];
const usedIds = new Set();
let seq = 1;
for (const item of (Array.isArray(gen.items) ? gen.items : [])) {
  if (!item || typeof item.index !== 'number' || !selected[item.index]) continue;
  const sel = selected[item.index];
  if (item.pattern !== sel.pattern) item.pattern = sel.pattern;
  const row = buildScenarioRow(item, sel.story, tplMap, dateStr, seq);
  if (row && !usedIds.has(row.id)) {
    usedIds.add(row.id);
    scenarios.push(row);
    seq += 1;
  }
}
return [{ json: { scenarios: scenarios, themes: prep.themes || [], newsPool: prep.newsPool || [], dateStr: dateStr, nextSeq: seq } }];
`;

const CODE_PREP_TOPUP = `${HELPERS}
const prev = $input.first().json;
const need = Math.max(1, 12 - (prev.scenarios || []).length);
const newsPool = prev.newsPool || [];
const body = {
  model: 'gpt-4.1',
  temperature: 0.8,
  max_tokens: 16000,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: ${JSON.stringify(TOPUP_SYSTEM)} },
    {
      role: 'user',
      content: JSON.stringify({
        temas: (prev.themes && prev.themes.length > 0) ? prev.themes : ['accidentes de tránsito', 'motociclistas', 'peatones', 'lluvia y distancia de frenado', 'distracción con el celular'],
        titulares: newsPool.slice(0, 10).map(function (s) { return s.news_title; }),
        generar: need,
      }),
    },
  ],
};
return [{ json: { body: body, prev: prev } }];
`;

const CODE_BUILD_TOPUP = `${HELPERS}
const gen = parseOpenAI($input.first().json) || { items: [] };
const prev = $('Prep Top-Up').first().json.prev;
const tplMap = templatesByPattern(rowsOf('Fetch Templates'));
const dateStr = prev.dateStr || todayDateStr();
const newsPool = prev.newsPool || [];
const fallbackStory = {
  news_title: 'Tendencias de tránsito en El Salvador',
  news_url: 'https://news.google.com/search?q=transito%20El%20Salvador&hl=es-419&gl=SV',
  news_source: 'Google News',
  news_published_at: null,
  news_summary: null,
};
const scenarios = (prev.scenarios || []).slice();
const usedIds = new Set(scenarios.map(function (s) { return s.id; }));
let seq = prev.nextSeq || scenarios.length + 1;
let poolIdx = 0;
for (const item of (Array.isArray(gen.items) ? gen.items : [])) {
  if (!item || typeof item !== 'object') continue;
  item.mode = 'overlay';
  const story = newsPool.length > 0 ? newsPool[poolIdx % newsPool.length] : fallbackStory;
  poolIdx += 1;
  const row = buildScenarioRow(item, story, tplMap, dateStr, seq);
  if (row && !usedIds.has(row.id)) {
    usedIds.add(row.id);
    scenarios.push(row);
    seq += 1;
  }
}
return [{ json: { scenarios: scenarios } }];
`;

const CODE_FINALIZE = `
const j = $input.first().json;
const scenarios = Array.isArray(j.scenarios) ? j.scenarios : [];
const seen = new Set();
const payload = [];
for (const s of scenarios) {
  if (!s || !s.id || seen.has(s.id)) continue;
  seen.add(s.id);
  payload.push({
    id: s.id,
    definition: s.definition,
    generation_mode: s.generation_mode,
    news_title: s.news_title,
    news_url: s.news_url,
    news_source: s.news_source,
    news_published_at: s.news_published_at,
    news_summary: s.news_summary,
  });
}
if (payload.length === 0) {
  throw new Error('No valid scenarios were generated in this run.');
}
return [{ json: { payload: payload, count: payload.length } }];
`;

// ─────────────────────────────────────────────────────────────────────────────
// Nodes + connections
// ─────────────────────────────────────────────────────────────────────────────

function gnews(query) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=es-419&gl=SV&ceid=SV:es-419`;
}

function codeNode(name, jsCode, position) {
  return {
    name,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
    alwaysOutputData: true,
    parameters: { mode: "runOnceForAllItems", jsCode },
  };
}

function openAiNode(name, position) {
  return {
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: "POST",
      url: "https://api.openai.com/v1/chat/completions",
      authentication: "predefinedCredentialType",
      nodeCredentialType: "openAiApi",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.body) }}",
      options: { timeout: 180000 },
    },
    credentials: { openAiApi: { ...OPENAI_CRED } },
  };
}

function supabaseGetNode(name, pathAndQuery, position) {
  return {
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    alwaysOutputData: true,
    parameters: {
      method: "GET",
      url: `${restUrl}/${pathAndQuery}`,
      authentication: "predefinedCredentialType",
      nodeCredentialType: "supabaseApi",
      options: { timeout: 60000 },
    },
    credentials: { supabaseApi: { ...SUPABASE_CRED } },
  };
}

const rssQueries = [
  ["RSS Accidentes", gnews('"accidente de tránsito" El Salvador when:2d')],
  [
    "RSS Seguridad Vial",
    gnews('("seguridad vial" OR "ley de tránsito" OR VMT) El Salvador when:2d'),
  ],
  [
    "RSS Vial General",
    gnews(
      "(carretera OR conductor OR motociclista OR peatón OR bus) El Salvador when:2d",
    ),
  ],
  ["RSS elsalvador.com", "https://www.elsalvador.com/feed/"],
];

const nodes = [
  {
    name: "Daily 6am SV",
    type: "n8n-nodes-base.scheduleTrigger",
    typeVersion: 1.2,
    position: [-1180, -80],
    parameters: {
      rule: {
        interval: [{ field: "cronExpression", expression: "0 6 * * *" }],
      },
    },
  },
  {
    name: "Manual Run Webhook",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [-1180, 120],
    parameters: {
      httpMethod: "POST",
      path: "driverlab-news-run",
      responseMode: "onReceived",
      options: {},
    },
  },
  ...rssQueries.map(([name, url], i) => ({
    name,
    type: "n8n-nodes-base.rssFeedRead",
    typeVersion: 1,
    position: [-960, -220 + i * 140],
    alwaysOutputData: true,
    onError: "continueRegularOutput",
    parameters: { url, options: {} },
  })),
  {
    name: "Merge Feeds",
    type: "n8n-nodes-base.merge",
    typeVersion: 3,
    position: [-740, -80],
    alwaysOutputData: true,
    parameters: { mode: "append", numberInputs: 4 },
  },
  codeNode("Normalize Stories", CODE_NORMALIZE, [-560, -80]),
  supabaseGetNode(
    "Fetch Seen URLs",
    "news_scenarios?select=news_url",
    [-380, -80],
  ),
  supabaseGetNode(
    "Fetch Templates",
    "scenario_templates?select=id,pattern,module_id,lesson_ids,definition",
    [-200, -80],
  ),
  codeNode("Prep Triage", CODE_PREP_TRIAGE, [-20, -80]),
  openAiNode("OpenAI Triage", [160, -80]),
  codeNode("Prep Generate", CODE_PREP_GENERATE, [340, -80]),
  openAiNode("OpenAI Generate", [520, -80]),
  codeNode("Build & Validate", CODE_BUILD_VALIDATE, [700, -80]),
  {
    name: "Enough Scenarios?",
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [880, -80],
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: "",
          typeValidation: "strict",
        },
        combinator: "and",
        conditions: [
          {
            leftValue: "={{ $json.scenarios.length }}",
            rightValue: 10,
            operator: { type: "number", operation: "gte" },
          },
        ],
      },
    },
  },
  codeNode("Prep Top-Up", CODE_PREP_TOPUP, [1060, 60]),
  openAiNode("OpenAI Top-Up", [1240, 60]),
  codeNode("Build & Validate Top-Up", CODE_BUILD_TOPUP, [1420, 60]),
  codeNode("Finalize Payload", CODE_FINALIZE, [1600, -80]),
  {
    name: "Insert Scenarios",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [1780, -80],
    parameters: {
      method: "POST",
      url: `${restUrl}/news_scenarios?on_conflict=id`,
      authentication: "predefinedCredentialType",
      nodeCredentialType: "supabaseApi",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "Prefer", value: "resolution=ignore-duplicates" }],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.payload) }}",
      options: { timeout: 60000 },
    },
    credentials: { supabaseApi: { ...SUPABASE_CRED } },
  },
];

function to(name, index = 0) {
  return { node: name, type: "main", index };
}

const connections = {
  "Daily 6am SV": {
    main: [rssQueries.map(([name]) => to(name))],
  },
  "Manual Run Webhook": {
    main: [rssQueries.map(([name]) => to(name))],
  },
  ...Object.fromEntries(
    rssQueries.map(([name], i) => [
      name,
      { main: [[to("Merge Feeds", i)]] },
    ]),
  ),
  "Merge Feeds": { main: [[to("Normalize Stories")]] },
  "Normalize Stories": { main: [[to("Fetch Seen URLs")]] },
  "Fetch Seen URLs": { main: [[to("Fetch Templates")]] },
  "Fetch Templates": { main: [[to("Prep Triage")]] },
  "Prep Triage": { main: [[to("OpenAI Triage")]] },
  "OpenAI Triage": { main: [[to("Prep Generate")]] },
  "Prep Generate": { main: [[to("OpenAI Generate")]] },
  "OpenAI Generate": { main: [[to("Build & Validate")]] },
  "Build & Validate": { main: [[to("Enough Scenarios?")]] },
  "Enough Scenarios?": {
    main: [[to("Finalize Payload")], [to("Prep Top-Up")]],
  },
  "Prep Top-Up": { main: [[to("OpenAI Top-Up")]] },
  "OpenAI Top-Up": { main: [[to("Build & Validate Top-Up")]] },
  "Build & Validate Top-Up": { main: [[to("Finalize Payload")]] },
  "Finalize Payload": { main: [[to("Insert Scenarios")]] },
};

const workflow = {
  name: "DriverLab — Escenarios de Noticias",
  nodes,
  connections,
  settings: {
    executionOrder: "v1",
    timezone: "America/El_Salvador",
    saveDataErrorExecution: "all",
    saveDataSuccessExecution: "all",
  },
};

const outPath = path.join(rootDir, "docs/n8n/news-scenarios-workflow.json");
writeFileSync(outPath, `${JSON.stringify(workflow, null, 2)}\n`);
console.log(
  `Workflow written to ${path.relative(rootDir, outPath)} (${nodes.length} nodes).`,
);
