// @ts-check
/**
 * Tiny DOM and SVG helpers shared by all screens (DRY).
 * @module dom
 */

export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @typedef {Object} ElOptions
 * @property {string} [cls] CSS class(es).
 * @property {string} [text] Text content.
 * @property {string} [id] Element id.
 * @property {Object<string, string|number>} [attrs] Extra attributes.
 * @property {Object<string, EventListener>} [on] Event listeners.
 */

/**
 * Applies options to an element.
 * @param {Element} node Element.
 * @param {ElOptions} opts Options.
 * @param {(Node|string|null|undefined|false)[]} children Child nodes.
 * @returns {void}
 */
function apply(node, opts, children) {
  if (opts.cls) node.setAttribute('class', opts.cls);
  if (opts.id) node.id = opts.id;
  if (opts.text !== undefined) node.textContent = opts.text;
  Object.entries(opts.attrs || {}).forEach(([k, v]) => node.setAttribute(k, String(v)));
  Object.entries(opts.on || {}).forEach(([k, fn]) => node.addEventListener(k, fn));
  children.forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  });
}

/**
 * Creates an HTML element.
 * @param {string} tag Tag name.
 * @param {ElOptions} [opts] Options.
 * @param {(Node|string|null|undefined|false)[]} [children] Children.
 * @returns {HTMLElement}
 */
export function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  apply(node, opts, children);
  return node;
}

/**
 * Creates an SVG element.
 * @param {string} tag SVG tag name.
 * @param {Object<string, string|number>} [attrs] Attributes.
 * @param {(Node|null|undefined|false)[]} [children] Children.
 * @returns {SVGElement}
 */
export function svg(tag, attrs = {}, children = []) {
  const node = /** @type {SVGElement} */ (document.createElementNS(SVG_NS, tag));
  const { class: cls, ...rest } = attrs;
  apply(node, { attrs: rest, cls: cls === undefined ? undefined : String(cls) }, children);
  return node;
}

/**
 * Creates an `<svg>` root that scales to its container.
 * @param {string} viewBox ViewBox, e.g. "0 0 100 100".
 * @param {string} [cls] CSS class.
 * @param {(Node|null|undefined|false)[]} [children] Children.
 * @returns {SVGElement}
 */
export function svgRoot(viewBox, cls = '', children = []) {
  return svg('svg', { viewBox, class: cls, 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid meet' }, children);
}

/**
 * Hand-drawn style path: fill plus dark, round outline.
 * @param {string} d Path data.
 * @param {string} fill Fill colour.
 * @param {Object<string, string|number>} [extra] Extra attributes.
 * @returns {SVGElement}
 */
export function inked(d, fill, extra = {}) {
  return svg('path', { d, fill, class: 'ink', ...extra });
}

/**
 * Finds an element and fails loudly if it is missing.
 * @param {string} selector CSS selector.
 * @param {ParentNode} [root] Search root.
 * @returns {HTMLElement}
 */
export function $(selector, root = document) {
  const found = root.querySelector(selector);
  if (!found) throw new Error(`Element fehlt: ${selector}`);
  return /** @type {HTMLElement} */ (found);
}

/**
 * Removes all children of a node.
 * @param {Element} node Node to empty.
 * @returns {void}
 */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/**
 * Restarts a CSS animation class on an element.
 * @param {Element} node Element.
 * @param {string} cls Animation class.
 * @returns {void}
 */
export function replayClass(node, cls) {
  node.classList.remove(cls);
  void (/** @type {HTMLElement} */ (node).getBoundingClientRect());
  node.classList.add(cls);
}
