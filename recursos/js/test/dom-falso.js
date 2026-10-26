// DOM mínimo para probar ejercicios.js en Node sin dependencias. Solo implementa
// lo que usa el código: no es un navegador. Selectores admitidos: «.clase» y
// «.a .b» (descendiente).

class ListaClases {
  constructor(el) { this.el = el; }
  _lista() { return this.el.className.split(/\s+/).filter(Boolean); }
  add(...n) { const l = new Set(this._lista()); n.forEach((x) => l.add(x)); this.el.className = [...l].join(" "); }
  remove(...n) { this.el.className = this._lista().filter((x) => !n.includes(x)).join(" "); }
  contains(n) { return this._lista().includes(n); }
  toggle(n, forzar) {
    const tiene = this.contains(n);
    const poner = forzar === undefined ? !tiene : Boolean(forzar);
    if (poner) this.add(n); else this.remove(n);
    return poner;
  }
}

export class Nodo {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.className = "";
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this._attrs = {};
    this._oyentes = {};
    this._texto = "";
    this.classList = new ListaClases(this);
    this.disabled = false;
    this.checked = false;
    this.value = "";
    this.id = "";
  }
  get textContent() { return this._texto + this.children.map((c) => (typeof c === "string" ? c : c.textContent)).join(""); }
  set textContent(t) { this.children = []; this._texto = String(t); }
  get nextSibling() {
    const i = this.parentNode.children.indexOf(this);
    return this.parentNode.children[i + 1] ?? null;
  }
  setAttribute(n, v) {
    this._attrs[n] = String(v);
    if (n.startsWith("data-")) this.dataset[n.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
    if (n === "id") this.id = String(v);
  }
  getAttribute(n) { return this._attrs[n] ?? null; }
  _adoptar(x) {
    if (typeof x === "string") return x;
    if (x.parentNode) x.parentNode.children.splice(x.parentNode.children.indexOf(x), 1);
    x.parentNode = this;
    return x;
  }
  append(...xs) { for (const x of xs) this.children.push(this._adoptar(x)); }
  appendChild(x) { this.append(x); return x; }
  insertBefore(nuevo, ref) {
    if (ref === null || ref === undefined) { this.append(nuevo); return nuevo; }
    this._adoptar(nuevo);
    this.children.splice(this.children.indexOf(ref), 0, nuevo);
    return nuevo;
  }
  replaceChild(nuevo, viejo) {
    const i = this.children.indexOf(viejo);
    if (i < 0) throw new Error("replaceChild: no es hijo");
    this._adoptar(nuevo);
    const j = this.children.indexOf(viejo);
    this.children.splice(j, 1, nuevo);
    viejo.parentNode = null;
    return viejo;
  }
  remove() { if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; }
  addEventListener(tipo, f) { (this._oyentes[tipo] ??= []).push(f); }
  dispatch(tipo) {
    const ev = { type: tipo, target: this, preventDefault() {} };
    for (const f of this._oyentes[tipo] ?? []) f(ev);
  }
  click() { if (!this.disabled) this.dispatch("click"); }
  _descendientes(salida = []) {
    for (const c of this.children) if (typeof c !== "string") { salida.push(c); c._descendientes(salida); }
    return salida;
  }
  _coincide(clase) { return this.classList.contains(clase); }
  querySelectorAll(selector) {
    const partes = selector.trim().split(/\s+/).map((p) => { if (!p.startsWith(".")) throw new Error("selector no soportado: " + selector); return p.slice(1); });
    let actuales = [this];
    for (const clase of partes) {
      const sig = [];
      for (const n of actuales) for (const d of n._descendientes()) if (d._coincide(clase) && !sig.includes(d)) sig.push(d);
      actuales = sig;
    }
    return actuales;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

export class DocumentoFalso {
  constructor() { this.body = new Nodo("body"); }
  createElement(tag) { return new Nodo(tag); }
  querySelectorAll(s) { return this.body.querySelectorAll(s); }
  querySelector(s) { return this.body.querySelector(s); }
}

/** Almacén en memoria con la interfaz de Storage. */
export class AlmacenamientoFalso {
  constructor() { this.datos = new Map(); }
  get length() { return this.datos.size; }
  key(i) { return [...this.datos.keys()][i] ?? null; }
  getItem(k) { return this.datos.has(k) ? this.datos.get(k) : null; }
  setItem(k, v) { this.datos.set(k, String(v)); }
  removeItem(k) { this.datos.delete(k); }
}

/** Construye un ejercicio con la misma estructura que genera scripts/lua/ejercicios.lua. */
export function construirEjercicio(doc, { id, tipo, attrs = {}, enunciado = "Enunciado", opciones = [], pistas = [], solucion = null, razonamiento = null, pasos = false }) {
  const el = doc.createElement("div");
  el.setAttribute("id", id);
  el.className = `ejercicio ej-${tipo}`;
  el.setAttribute("data-tipo", tipo);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(`data-${k}`, v);
  const en = doc.createElement("div"); en.className = "ej-enunciado"; en.textContent = enunciado; el.append(en);
  if (opciones.length) {
    const lista = doc.createElement("div"); lista.className = pasos ? "ej-pasos" : "ej-opciones";
    opciones.forEach((o, i) => {
      const it = doc.createElement("div"); it.className = pasos ? "ej-paso" : "ej-opcion";
      it.setAttribute("data-indice", String(i + 1));
      const t = doc.createElement("div"); t.className = "ej-texto"; t.textContent = o.texto; it.append(t);
      if (o.feedback) { const f = doc.createElement("div"); f.className = "ej-feedback"; f.textContent = o.feedback; it.append(f); }
      lista.append(it);
    });
    el.append(lista);
  }
  if (pistas.length) {
    const c = doc.createElement("div"); c.className = "ej-pistas";
    for (const p of pistas) { const d = doc.createElement("div"); d.className = "ej-pista"; d.textContent = p; c.append(d); }
    el.append(c);
  }
  if (razonamiento) { const r = doc.createElement("div"); r.className = "ej-razonamiento"; r.textContent = razonamiento; el.append(r); }
  if (solucion) { const s = doc.createElement("div"); s.className = "ej-solucion"; s.textContent = solucion; el.append(s); }
  doc.body.append(el);
  return el;
}
