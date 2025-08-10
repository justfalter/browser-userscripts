// ==UserScript==
// @name        microcenter-show-discounts
// @namespace   https://github.com/justfalter/browser-userscripts
// @version     1.0.0
// @author      mike
// @description Adds discount percentage to Micro Center product listings for open box items. Orders results to display items with the greatest percentage discount first (per result page).
// @updateURL   https://raw.githubusercontent.com/justfalter/browser-userscripts/main/microcenter-show-discounts.user.js
// @downloadURL https://raw.githubusercontent.com/justfalter/browser-userscripts/main/microcenter-show-discounts.user.js
// @match       https://www.microcenter.com/*
// @match       http://www.microcenter.com/*
// @match       https://microcenter.com/*
// @match       http://microcenter.com/*
// @run-at      document-end
// ==/UserScript==

/******/ (() => {
/******/ 	"use strict";
var __webpack_exports__ = {};

function log(message) {
  console.log(`MICROCENTER USER SCRIPT: ${message}`);
}

const DISCOUNT_HIGHLIGHTED = 'discount-highlighted';
const PERCENT_DISCOUNT_ATTR = 'percent-discount';

function parsePrice(el) {
  if (!el) {
    return null;
  }

  var m = el.textContent.match(/[0-9,]+\.\d\d/);

  if (!m) {
    log('could not regex original price number');
    return null;
  }

  const ret = parseFloat(m[0].replace(',', ''));

  if (isNaN(ret)) {
    return null;
  }

  return ret;
}

function revealDiscount(rootEl) {
  const el = rootEl.querySelector('.price_wrapper');

  if (!el) {
    return;
  }

  if (el.querySelector(`.${DISCOUNT_HIGHLIGHTED}`)) {
    // Already marked
    return;
  }

  const orig_price = parsePrice(el.querySelector('.price > span[itemprop="price"]'));
  let new_price = parsePrice(el.querySelector('.price-label.compareTo > strong'));

  if (!new_price) {
    new_price = parsePrice(el.querySelector('.clearance > span'));
  }

  if (!new_price) {
    log('Missing new price');
    return;
  }

  if (!orig_price) {
    log('Missing original price');
    return;
  }

  log(`new price ${new_price}, old price ${orig_price}`);
  var discount = Math.round(100 - 100 * new_price / orig_price);
  var priceDiv = document.createElement('div');
  priceDiv.classList.add('price-label', DISCOUNT_HIGHLIGHTED);
  priceDiv.innerHTML = `<strong>Discount: ${discount}%</strong>`;
  el.append(priceDiv);
  rootEl.setAttribute(PERCENT_DISCOUNT_ATTR, discount.toString());
}

function revealDiscounts(baseElement) {
  const baseItemsEl = baseElement.querySelector('#productGrid > ul');

  if (!baseItemsEl) {
    log("Failed to find root of products");
    return;
  }

  const elements = Array.from(baseItemsEl.querySelectorAll(':scope > .product_wrapper'));

  for (var i = 0; i < elements.length; i++) {
    revealDiscount(elements[i]);
  }

  const sortedElements = elements.sort((a, b) => {
    const discountA = parseInt(a.getAttribute(PERCENT_DISCOUNT_ATTR)) || 0;
    const discountB = parseInt(b.getAttribute(PERCENT_DISCOUNT_ATTR)) || 0;
    return discountA > discountB ? -1 : 1;
  }); // Remove all existing children

  baseItemsEl.innerHTML = '';
  /*
  elements.forEach(el => {
    baseItemsEl.removeChild(el);
  });
  */

  sortedElements.forEach(el => {
    baseItemsEl.appendChild(el);
  });
}

function onMutate(mutations, wrapper) {
  wrapper.withObserverDisabled(function () {
    revealDiscounts(wrapper.baseElement);
  });
}

class ObserverWrapper {
  constructor(el, cb) {
    this.baseElement = el;
    this.cb = cb;
    this.observing = false;
    const self = this;
    this.observer = new MutationObserver(function (mutations) {
      self.cb(mutations, self);
    });
  }

  stop() {
    if (this.observing === false) {
      log('observer already stopped');
      return;
    }

    this.observing = false;
    this.observer.disconnect();
  }

  start() {
    if (this.observing === true) {
      log('observer already started');
      return;
    }

    this.observing = true;
    this.observer.observe(this.baseElement, {
      childList: true,
      subtree: true
    });
  }

  withObserverDisabled(fcb) {
    this.stop();

    try {
      fcb();
    } catch (err) {
      log(`withObserverDisabled: error while executing callback: ${err}`);
    } finally {
      log('resumed');
      this.start();
    }
  }

}

async function main() {
  if (window._observerWrapper) {
    // Already installed.
    return;
  }

  var monitoredElement = document.querySelector('#category > #mainContent > article#content.inline');

  if (monitoredElement !== undefined) {
    log('Creating wrapper');
    window._observerWrapper = new ObserverWrapper(monitoredElement, onMutate);
    log('Starting wrapper');

    window._observerWrapper.start();
  }
}

main().catch(e => {
  console.log(e);
});
/******/ })()
