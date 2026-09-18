/**
 * almasix.conduit client — dual vocabulary: conduit:* / wire:* and $conduit / $wire.
 * Goals: feel like pure JS — coalesce requests, idiomorph-lite, client bind/text/show.
 *
 * Subpath hosting: never assume site-root "/conduit/...". Read window.__CONDUIT__
 * (injected by @conduitScripts) or <meta name="conduit-endpoint|conduit-base">,
 * then fall back to deriving the prefix from this script's src.
 */
(function () {
  "use strict";

  /** Prefer conduit: then wire: when both are present. */
  const PREFIXES = ["conduit", "wire"];

  function attr(el, name) {
    for (let i = 0; i < PREFIXES.length; i++) {
      const v = el.getAttribute(PREFIXES[i] + ":" + name);
      if (v != null) return v;
    }
    return null;
  }

  function hasAttr(el, name) {
    for (let i = 0; i < PREFIXES.length; i++) {
      if (el.hasAttribute(PREFIXES[i] + ":" + name)) return true;
    }
    return false;
  }

  function setAttrBoth(el, name, value) {
    for (let i = 0; i < PREFIXES.length; i++) {
      el.setAttribute(PREFIXES[i] + ":" + name, value);
    }
  }

  function cssEscapeName(name) {
    return String(name).replace(/\./g, "\\.").replace(/:/g, "\\:");
  }

  function selector(name) {
    const esc = cssEscapeName(name);
    return PREFIXES.map((p) => "[" + p + "\\:" + esc + "]").join(", ");
  }

  function closestRoot(el) {
    return el.closest("[conduit\\:id], [wire\\:id], [data-conduit]");
  }

  function stripPrefix(attrName) {
    for (let i = 0; i < PREFIXES.length; i++) {
      const p = PREFIXES[i] + ":";
      if (attrName.startsWith(p)) return attrName.slice(p.length);
    }
    return null;
  }

  function readConfig() {
    const boot = window.__CONDUIT__ || {};
    const metaEndpoint = document.querySelector('meta[name="conduit-endpoint"]');
    const metaBase = document.querySelector('meta[name="conduit-base"]');
    let endpoint = boot.endpoint || (metaEndpoint && metaEndpoint.getAttribute("content")) || "";
    let base = boot.base || (metaBase && metaBase.getAttribute("content")) || "";
    if (!endpoint || !base) {
      const scripts = document.getElementsByTagName("script");
      for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src || "";
        const idx = src.indexOf("/conduit/conduit.js");
        if (idx >= 0) {
          try {
            const u = new URL(src, window.location.origin);
            const path = u.pathname;
            const cut = path.indexOf("/conduit/conduit.js");
            base = base || path.slice(0, cut);
            endpoint = endpoint || path.slice(0, cut) + "/conduit/update";
          } catch (_) {}
          break;
        }
      }
    }
    return {
      base: base || "",
      endpoint: endpoint || "/conduit/update",
      upload: boot.upload || "",
      coalesceMs: boot.coalesceMs || 16,
      signed: boot.signed !== false,
    };
  }

  const CONFIG = readConfig();
  let ENDPOINT = CONFIG.endpoint;
  const COALESCE_MS = CONFIG.coalesceMs;
  const APP_BASE = CONFIG.base; // "" or "/my-app"

  function currentEndpoint() {
    return ENDPOINT || CONFIG.endpoint;
  }

  /** Prefix a root-absolute path with APP_BASE when missing (subpath safety net). */
  function withBase(path) {
    if (!path || typeof path !== "string") return path;
    if (/^([a-zA-Z][a-zA-Z0-9+.-]*:)?\/\//.test(path) || path.startsWith("#") || path.startsWith("?")) {
      return path;
    }
    if (!APP_BASE) return path;
    if (!path.startsWith("/")) return path;
    if (path === APP_BASE || path.startsWith(APP_BASE + "/")) return path;
    return APP_BASE + path;
  }

  function cookieValue(name) {
    const prefix = name + "=";
    const parts = String(document.cookie || "").split("; ");
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(prefix) === 0) {
        return decodeURIComponent(parts[i].slice(prefix.length));
      }
    }
    return "";
  }

  function csrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
      const fromMeta = meta.getAttribute("content") || "";
      if (fromMeta) return fromMeta;
    }
    const input = document.querySelector('input[name="_token"]');
    if (input && input.value) return input.value;
    // Laravel / Almasix SPA parity: readable XSRF-TOKEN cookie.
    return cookieValue("XSRF-TOKEN");
  }

  function parseInitial(el) {
    const raw = attr(el, "initial-data");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  /** Idiomorph-lite: patch attributes + children by key / tag+position. */
  function morph(fromEl, toEl) {
    if (!fromEl || !toEl) return;
    if (fromEl.nodeType !== 1 || toEl.nodeType !== 1) {
      fromEl.replaceWith(toEl);
      return;
    }
    if (fromEl.tagName !== toEl.tagName) {
      fromEl.replaceWith(toEl);
      return;
    }
    if (hasAttr(fromEl, "ignore") || hasAttr(fromEl, "ignore.self")) {
      if (hasAttr(fromEl, "ignore")) return;
    }
    const fromAttrs = fromEl.attributes;
    for (let i = fromAttrs.length - 1; i >= 0; i--) {
      const name = fromAttrs[i].name;
      const rest = stripPrefix(name);
      // Alpine owns visibility (x-show / x-cloak). Stripping client `style` or
      // re-adding `x-cloak` after Alpine removed it un-hides dropdowns/panels.
      if (name === "style" || name === "x-cloak") {
        continue;
      }
      if (
        !toEl.hasAttribute(name) &&
        rest !== "id" &&
        rest !== "initial-data" &&
        name !== "data-conduit"
      ) {
        fromEl.removeAttribute(name);
      }
    }
    for (const a of toEl.attributes) {
      const rest = stripPrefix(a.name);
      if (rest === "initial-data") continue;
      if (a.name === "style" || a.name === "x-cloak") continue;
      if (fromEl.getAttribute(a.name) !== a.value) {
        fromEl.setAttribute(a.name, a.value);
      }
    }
    const fromKids = Array.from(fromEl.childNodes);
    const toKids = Array.from(toEl.childNodes);
    const keyed = new Map();
    fromKids.forEach((n) => {
      if (n.nodeType === 1 && n.getAttribute) {
        const k = attr(n, "key");
        if (k) keyed.set(k, n);
      }
    });
    let fi = 0;
    for (let ti = 0; ti < toKids.length; ti++) {
      const t = toKids[ti];
      if (t.nodeType === 3) {
        const f = fromKids[fi];
        if (f && f.nodeType === 3) {
          if (f.nodeValue !== t.nodeValue) f.nodeValue = t.nodeValue;
          fi++;
        } else {
          fromEl.insertBefore(document.createTextNode(t.nodeValue), fromKids[fi] || null);
        }
        continue;
      }
      if (t.nodeType !== 1) continue;
      const key = attr(t, "key");
      let f = key && keyed.get(key);
      if (!f) {
        f = fromKids[fi];
        while (f && f.nodeType !== 1) {
          fi++;
          f = fromKids[fi];
        }
      }
      if (f && f.nodeType === 1 && f.tagName === t.tagName) {
        morph(f, t);
        if (f !== fromKids[fi]) {
          fromEl.insertBefore(f, fromKids[fi] || null);
        }
        fi++;
      } else {
        const clone = t.cloneNode(true);
        fromEl.insertBefore(clone, fromKids[fi] || null);
      }
    }
    while (fromEl.childNodes.length > toKids.length) {
      fromEl.removeChild(fromEl.lastChild);
    }
  }

  function morphHtml(fromEl, html) {
    if (hasAttr(fromEl, "ignore")) return;
    const tpl = document.createElement("template");
    tpl.innerHTML = String(html).trim();
    const next = tpl.content.firstElementChild;
    if (!next) {
      fromEl.innerHTML = html;
      return;
    }
    if (fromEl.tagName === next.tagName) {
      morph(fromEl, next);
      const data = attr(next, "initial-data");
      if (data) setAttrBoth(fromEl, "initial-data", data);
      bindDirectives(fromEl, fromEl.__conduitSnapshot);
      applyClientBindings(fromEl);
    } else {
      fromEl.replaceWith(next);
      bootElement(next);
    }
  }

  function morphIsland(root, name, html) {
    const target = Array.from(root.querySelectorAll(selector("island"))).find(
      (n) => attr(n, "island") === name
    );
    if (!target) {
      morphHtml(root, html);
      return;
    }
    const tpl = document.createElement("template");
    tpl.innerHTML = String(html).trim();
    const next = tpl.content.firstElementChild || tpl.content;
    if (next.nodeType === 1) morph(target, next);
    else target.innerHTML = html;
  }

  const queues = new WeakMap();

  function enqueue(el, snapshot, piece) {
    let q = queues.get(el);
    if (!q) {
      q = { updates: [], calls: [], island: null, timer: null, waiters: [] };
      queues.set(el, q);
    }
    if (piece.updates) q.updates.push(...piece.updates);
    if (piece.calls) q.calls.push(...piece.calls);
    if (piece.island) q.island = piece.island;
    return new Promise((resolve) => {
      q.waiters.push(resolve);
      if (q.timer) clearTimeout(q.timer);
      q.timer = setTimeout(() => flush(el, snapshot), COALESCE_MS);
    });
  }

  async function flush(el, snapshot) {
    const q = queues.get(el);
    if (!q) return;
    queues.delete(el);
    const payload = {
      updates: q.updates,
      calls: q.calls,
      island: q.island,
    };
    setLoading(el, true);
    const scrollY = payload.calls.some((c) => c.meta && c.meta.preserveScroll)
      ? window.scrollY
      : null;
    const result = await requestUpdate(snapshot, payload);
    setLoading(el, false);
    if (scrollY !== null) window.scrollTo(0, scrollY);
    if (result && result.serverMemo) {
      snapshot.serverMemo = result.serverMemo;
      if (result.fingerprint) snapshot.fingerprint = result.fingerprint;
      el.__conduitSnapshot = snapshot;
    }
    applyEffects(el, result, snapshot);
    q.waiters.forEach((r) => r(result));
  }

  async function requestUpdate(snapshot, { updates = [], calls = [], island = null } = {}) {
    const body = {
      fingerprint: snapshot.fingerprint,
      serverMemo: snapshot.serverMemo,
      updates,
      calls,
      island,
    };
    const token = csrfToken();
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Conduit": "true",
    };
    if (token) {
      headers["X-CSRF-TOKEN"] = token;
      headers["X-XSRF-TOKEN"] = token;
    }
    const res = await fetch(withBase(currentEndpoint()), {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[conduit] update failed", res.status);
      return null;
    }
    return res.json();
  }

  function setLoading(el, on) {
    el.toggleAttribute("data-loading", on);
    el.querySelectorAll(selector("loading") + ", [data-loading]").forEach((n) => {
      if (on) {
        n.setAttribute("data-loading", "true");
        if (hasAttr(n, "loading")) n.style.display = "";
      } else {
        n.removeAttribute("data-loading");
      }
    });
    el.classList.toggle("conduit-dirty", on);
  }

  function applyClientBindings(el) {
    const snap = el.__conduitSnapshot;
    if (!snap || !snap.serverMemo) return;
    const data = snap.serverMemo.data || {};
    const errors = snap.serverMemo.errors || {};
    el.__wireErrors = errors;

    el.querySelectorAll(selector("text")).forEach((node) => {
      const key = attr(node, "text");
      if (key && key in data) node.textContent = data[key] == null ? "" : String(data[key]);
    });
    el.querySelectorAll(selector("show")).forEach((node) => {
      const key = attr(node, "show");
      const show = !!(key && data[key]);
      node.style.display = show ? "" : "none";
    });
    Array.from(el.querySelectorAll("*")).forEach((node) => {
      Array.from(node.attributes || []).forEach((a) => {
        const rest = stripPrefix(a.name);
        if (!rest || !rest.startsWith("bind:")) return;
        const prop = rest.slice("bind:".length);
        const expr = a.value;
        let val;
        try {
          val = Function("data", "$wire", "$conduit", "return (" + expr + ")")(
            data,
            el.__wire,
            el.__wire
          );
        } catch (_) {
          val = data[expr];
        }
        if (prop === "class") {
          if (typeof val === "string") node.className = val;
          else if (val && typeof val === "object") {
            Object.entries(val).forEach(([c, on]) => node.classList.toggle(c, !!on));
          }
        } else if (prop === "style" && val && typeof val === "object") {
          Object.assign(node.style, val);
        } else if (typeof val === "boolean") {
          if (val) node.setAttribute(prop, "");
          else node.removeAttribute(prop);
        } else if (val != null) {
          node.setAttribute(prop, String(val));
        }
      });
    });
  }

  function applyEffects(el, result, snapshot) {
    if (!result) return;
    if (result.error) {
      console.error("[conduit]", result.error);
      return;
    }
    const effects = result.effects || {};
    // Prefer the full server memo (includes a fresh checksum). Only patch
    // data/errors when the server omitted serverMemo.
    if (result.serverMemo && snapshot) {
      snapshot.serverMemo = result.serverMemo;
      if (result.fingerprint) snapshot.fingerprint = result.fingerprint;
      el.__conduitSnapshot = snapshot;
    } else if (effects.data && snapshot) {
      snapshot.serverMemo.data = effects.data;
      if (effects.errors) snapshot.serverMemo.errors = effects.errors;
    }
    if (effects.queryString) {
      const url = new URL(window.location.href);
      Object.entries(effects.queryString).forEach(([k, v]) => {
        if (v === null || v === undefined || v === "") url.searchParams.delete(k);
        else url.searchParams.set(k, String(v));
      });
      window.history.replaceState({}, "", url);
    }
    if (effects.endpoint) {
      ENDPOINT = effects.endpoint;
      CONFIG.endpoint = effects.endpoint;
      const meta = document.querySelector('meta[name="conduit-endpoint"]');
      if (meta) meta.setAttribute("content", effects.endpoint);
      if (window.__CONDUIT__) window.__CONDUIT__.endpoint = effects.endpoint;
    }
    if (effects.redirect && effects.redirect.url) {
      const url = withBase(String(effects.redirect.url));
      if (effects.redirect.navigate) {
        // Soft navigate: fall through to click-handler style fetch below.
        fetch(url, { headers: { "X-Conduit-Navigate": "true", Accept: "text/html" }, credentials: "same-origin" })
          .then((r) => r.text())
          .then((html) => {
            const doc = new DOMParser().parseFromString(html, "text/html");
            const nextMain = doc.querySelector("[data-conduit-navigate]") || doc.body;
            const curMain = document.querySelector("[data-conduit-navigate]") || document.body;
            if (curMain && nextMain && curMain !== document.body) {
              curMain.innerHTML = nextMain.innerHTML;
            } else {
              document.body.innerHTML = doc.body.innerHTML;
            }
            document.title = doc.title;
            history.pushState({}, "", url);
            bootAll(document);
            syncOffline();
          });
      } else {
        window.location.assign(url);
      }
      return;
    }
    (effects.dispatches || []).forEach((d) => {
      if (d.event === "__js" && d.params && d.params.expr) {
        try {
          Function("$wire", "$conduit", d.params.expr)(el.__wire, el.__wire);
        } catch (e) {
          console.error("[conduit] $js", e);
        }
        return;
      }
      window.dispatchEvent(new CustomEvent(d.event, { detail: d.params || {} }));
    });
    applyClientBindings(el);
    if (effects.islands) {
      Object.entries(effects.islands).forEach(([name, html]) => morphIsland(el, name, html));
      return;
    }
    if (effects.island && effects.html) {
      morphIsland(el, effects.island, effects.html);
      return;
    }
    if (effects.html) morphHtml(el, effects.html);
  }

  function wireProxy(el, snapshot) {
    return new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "$refresh") {
            return () =>
              enqueue(el, snapshot, { calls: [{ method: "$refresh", params: [] }] });
          }
          if (prop === "$set") {
            return (name, value) =>
              enqueue(el, snapshot, { updates: [[name, value]] });
          }
          if (prop === "$toggle") {
            return (name) =>
              enqueue(el, snapshot, { calls: [{ method: "$toggle", params: [name] }] });
          }
          if (prop === "$dispatch") {
            return (event, params) =>
              window.dispatchEvent(new CustomEvent(event, { detail: params || {} }));
          }
          if (prop === "$errors") return el.__wireErrors || {};
          if (prop === "$island") {
            return (name, opts) => {
              const method = (opts && opts.method) || "$refresh";
              return enqueue(el, snapshot, {
                island: name,
                calls: [{ method, params: (opts && opts.params) || [], island: name }],
              });
            };
          }
          if (prop === "$entangle") {
            return (name) => ({
              get value() {
                return snapshot.serverMemo.data[name];
              },
              set value(v) {
                // Do not mutate checksummed memo — send an update instead.
                enqueue(el, snapshot, { updates: [[name, v]] });
              },
            });
          }
          if (typeof prop === "string" && prop in (snapshot.serverMemo.data || {})) {
            return snapshot.serverMemo.data[prop];
          }
          return (...params) => {
            const meta = {};
            return enqueue(el, snapshot, {
              calls: [{ method: String(prop), params, meta }],
            });
          };
        },
        set(_t, prop, value) {
          // Keep serverMemo.data aligned with the last checksummed snapshot.
          enqueue(el, snapshot, { updates: [[String(prop), value]] });
          return true;
        },
      }
    );
  }

  function parseClick(methodAttr) {
    const m = String(methodAttr).match(/^([a-zA-Z_][\w]*)\s*(?:\((.*)\))?$/);
    if (!m) return { method: methodAttr, params: [] };
    const params = [];
    if (m[2]) {
      try {
        params.push(...Function("return [" + m[2] + "]")());
      } catch (_) {}
    }
    return { method: m[1], params };
  }

  function modelSelector() {
    const mods = ["model", "model.live", "model.blur", "model.change", "model.deep", "model.live.blur"];
    return mods.map((m) => selector(m)).join(", ");
  }

  function bindDirectives(el, snapshot) {
    el.querySelectorAll(selector("click")).forEach((btn) => {
      if (btn.__conduitBound) return;
      btn.__conduitBound = true;
      btn.addEventListener("click", (e) => {
        if (hasAttr(btn, "confirm")) {
          const msg = attr(btn, "confirm") || "Are you sure?";
          if (!window.confirm(msg)) {
            e.preventDefault();
            return;
          }
        }
        e.preventDefault();
        const raw = attr(btn, "click");
        const { method, params } = parseClick(raw);
        const meta = {};
        if (hasAttr(btn, "click.renderless") || /\.renderless/.test(raw || ""))
          meta.renderless = true;
        if (hasAttr(btn, "click.preserve-scroll")) meta.preserveScroll = true;
        const island = attr(btn, "island");
        const call = { method: method.replace(/\.renderless$/, ""), params, meta };
        if (island) call.island = island;
        enqueue(el, snapshot, { calls: [call], island });
      });
    });

    el.querySelectorAll(selector("submit")).forEach((form) => {
      if (form.__conduitBound) return;
      form.__conduitBound = true;
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const method = attr(form, "submit") || "submit";
        // Sync current field values before the action (blur may not have fired).
        const updates = [];
        form.querySelectorAll(modelSelector()).forEach((input) => {
          const name =
            attr(input, "model") ||
            attr(input, "model.live") ||
            attr(input, "model.blur") ||
            attr(input, "model.change") ||
            attr(input, "model.deep") ||
            attr(input, "model.live.blur");
          if (!name) return;
          let value;
          if (input.type === "checkbox") {
            value = input.type === "checkbox" && input.getAttribute("value") != null && input.getAttribute("value") !== "on"
              ? input.checked
                ? input.value
                : null
              : input.checked;
          } else if (input.type === "radio") {
            if (!input.checked) return;
            value = input.value;
          } else {
            value = input.value;
          }
          updates.push({ name, value });
        });
        enqueue(el, snapshot, { updates, calls: [{ method, params: [] }] });
      });
    });

    el.querySelectorAll(modelSelector()).forEach((input) => {
      if (input.__conduitBound) return;
      input.__conduitBound = true;
      let name =
        attr(input, "model") ||
        attr(input, "model.live") ||
        attr(input, "model.blur") ||
        attr(input, "model.change") ||
        attr(input, "model.deep") ||
        attr(input, "model.live.blur");
      if (!name) return;
      const live = hasAttr(input, "model.live") || hasAttr(input, "model.live.blur");
      const blurOnly = hasAttr(input, "model.blur") || hasAttr(input, "model.live.blur");
      const debounceMs = (() => {
        for (const a of input.attributes) {
          const rest = stripPrefix(a.name);
          if (!rest) continue;
          const m = rest.match(/^model\.debounce\.(\d+)ms$/);
          if (m) return parseInt(m[1], 10);
        }
        return 0;
      })();
      let t = null;
      const read = () =>
        input.type === "checkbox" ? !!input.checked : input.type === "file" ? input.files : input.value;
      const push = () => {
        // Never mutate checksummed serverMemo.data before the roundtrip —
        // the server verifies the memo, then applies ``updates``.
        enqueue(el, snapshot, { updates: [[name, read()]] });
      };
      const onInput = () => {
        if (!live && blurOnly) return;
        if (debounceMs) {
          clearTimeout(t);
          t = setTimeout(push, debounceMs);
        } else if (live) push();
      };
      input.addEventListener("input", onInput);
      if (blurOnly) input.addEventListener("blur", push);
      else if (!live) input.addEventListener("change", push);
    });

    el.querySelectorAll(selector("poll")).forEach((node) => {
      if (node.__conduitPoll) return;
      const raw = attr(node, "poll") || "5s";
      let ms = 5000;
      const m = String(raw).match(/^(\d+)(ms|s)?$/);
      if (m) ms = parseInt(m[1], 10) * (m[2] === "ms" ? 1 : 1000);
      const island = attr(node, "island");
      node.__conduitPoll = setInterval(() => {
        enqueue(el, snapshot, {
          calls: [{ method: "$refresh", params: [], island }],
          island,
        });
      }, ms);
    });

    el.querySelectorAll(selector("intersect")).forEach((node) => {
      if (node.__conduitIo) return;
      const method = attr(node, "intersect") || "$refresh";
      const once = hasAttr(node, "intersect.once");
      const opts = { threshold: 0.01 };
      if (hasAttr(node, "intersect.half")) opts.threshold = 0.5;
      if (hasAttr(node, "intersect.full")) opts.threshold = 0.99;
      node.__conduitIo = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        const { method: meth, params } = parseClick(method);
        enqueue(el, snapshot, { calls: [{ method: meth, params }] });
        if (once) node.__conduitIo.disconnect();
      }, opts);
      node.__conduitIo.observe(node);
    });

    el.querySelectorAll(selector("init")).forEach((node) => {
      if (node.__conduitInit) return;
      node.__conduitInit = true;
      const method = attr(node, "init");
      if (method) {
        const { method: meth, params } = parseClick(method);
        enqueue(el, snapshot, { calls: [{ method: meth, params }] });
      }
    });

    el.querySelectorAll(selector("ref")).forEach((node) => {
      const ref = attr(node, "ref");
      if (!ref) return;
      el.__conduitRefs = el.__conduitRefs || {};
      el.__conduitRefs[ref] = node;
    });

    el.querySelectorAll(selector("sort")).forEach((list) => {
      if (list.__conduitSort) return;
      list.__conduitSort = true;
      const method = attr(list, "sort") || "sort";
      list.querySelectorAll(selector("sort:item")).forEach((item) => {
        item.draggable = true;
        item.addEventListener("dragstart", () => {
          list.__drag = item;
        });
        item.addEventListener("dragover", (e) => e.preventDefault());
        item.addEventListener("drop", (e) => {
          e.preventDefault();
          if (!list.__drag || list.__drag === item) return;
          list.insertBefore(list.__drag, item);
          const order = Array.from(list.querySelectorAll(selector("sort:item"))).map(
            (n, i) => attr(n, "sort:item") || String(i)
          );
          enqueue(el, snapshot, { calls: [{ method, params: [order] }] });
        });
      });
    });
  }

  function bootElement(el) {
    if (!el || el.__conduitBooted) return;
    const snap = parseInitial(el);
    if (!snap) {
      const lazy = attr(el, "lazy") === "true";
      const defer = attr(el, "defer") === "true";
      if (lazy || defer) {
        const load = () => {
          const name = attr(el, "name");
          const id = attr(el, "id");
          const empty = {
            fingerprint: { id, name, path: location.pathname, method: "GET" },
            serverMemo: { data: {}, checksum: "", errors: {} },
          };
          enqueue(el, empty, { calls: [{ method: "$load", params: [] }] }).then(() => {
            /* morph replaces el */
          });
        };
        if (defer) {
          requestAnimationFrame(load);
        } else {
          const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              io.disconnect();
              load();
            }
          });
          io.observe(el);
        }
      }
      return;
    }
    el.__conduitBooted = true;
    el.__conduitSnapshot = snap;
    el.__wire = wireProxy(el, snap);
    el.__conduit = el.__wire;
    bindDirectives(el, snap);
    applyClientBindings(el);
  }

  function bootAll(root) {
    (root || document)
      .querySelectorAll("[conduit\\:id], [wire\\:id], [data-conduit]")
      .forEach(bootElement);
  }

  function syncOffline() {
    const offline = !navigator.onLine;
    document.documentElement.toggleAttribute("data-conduit-offline", offline);
    document.querySelectorAll(selector("offline")).forEach((n) => {
      n.style.display = offline ? "" : "none";
    });
    document.querySelectorAll(selector("online")).forEach((n) => {
      n.style.display = offline ? "none" : "";
    });
  }
  window.addEventListener("online", syncOffline);
  window.addEventListener("offline", syncOffline);

  document.addEventListener("alpine:init", () => {
    if (!window.Alpine) return;
    const magicProxy = (el) => {
      const root = closestRoot(el);
      return root && root.__wire ? root.__wire : {};
    };
    window.Alpine.magic("wire", magicProxy);
    window.Alpine.magic("conduit", magicProxy);
    window.Alpine.magic("errors", (el) => {
      const root = closestRoot(el);
      return (root && root.__wireErrors) || {};
    });
  });

  document.addEventListener("click", (e) => {
    const a =
      e.target.closest &&
      (e.target.closest(selector("navigate")) || e.target.closest("[conduit\\:navigate], [wire\\:navigate]"));
    if (!a || a.target === "_blank") return;
    if (!hasAttr(a, "navigate")) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
    e.preventDefault();
    const target = withBase(href);
    const go = () => {
      fetch(target, { headers: { "X-Conduit-Navigate": "true", Accept: "text/html" } })
        .then((r) => r.text())
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const nextMain = doc.querySelector("[data-conduit-navigate]") || doc.body;
          const curMain = document.querySelector("[data-conduit-navigate]") || document.body;
          if (curMain && nextMain && curMain !== document.body) {
            curMain.innerHTML = nextMain.innerHTML;
          } else {
            document.body.innerHTML = doc.body.innerHTML;
          }
          document.title = doc.title;
          history.pushState({}, "", target);
          bootAll(document);
          syncOffline();
        });
    };
    if (document.startViewTransition) document.startViewTransition(go);
    else go();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      syncOffline();
      bootAll();
    });
  } else {
    syncOffline();
    bootAll();
  }

  window.Conduit = {
    boot: bootAll,
    csrfToken,
    enqueue,
    withBase,
    config: CONFIG,
    get endpoint() {
      return currentEndpoint();
    },
  };
})();
