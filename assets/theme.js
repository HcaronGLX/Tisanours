/* Tisa'nours — theme.js
   Header, menu mobile, panier latéral (Cart AJAX API + Section Rendering API),
   offres produit, sélecteur de variantes et galerie. */
(function () {
  'use strict';

  var theme = window.theme || {};
  var routes = theme.routes || { root: '/', cartAdd: '/cart/add', cartChange: '/cart/change', cart: '/cart' };
  var strings = theme.strings || {};
  var root = document.documentElement;

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function formatMoney(cents, format) {
    var value = (cents / 100).toFixed(2).replace('.', ',');
    var parts = value.split(',');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    value = parts.join(',');
    if (format && format.indexOf('{{') > -1) {
      return format.replace(/\{\{\s*\w+\s*\}\}/, value);
    }
    return value + ' €';
  }

  /* ---------- Hauteurs du header (pour le hero sous le header) ---------- */
  function measure() {
    var header = qs('.site-header');
    var ann = qs('.section-announcement');
    if (header) root.style.setProperty('--header-h', Math.round(header.getBoundingClientRect().height) + 'px');
    root.style.setProperty('--announcement-h', ann ? Math.round(ann.getBoundingClientRect().height) + 'px' : '0px');
  }

  function onScroll() {
    var header = qs('.site-header');
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }

  /* ---------- Menu mobile ---------- */
  function initMenu() {
    var header = qs('.site-header');
    if (!header) return;
    var toggle = qs('[data-menu-toggle]', header);
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var open = !header.classList.contains('menu-open');
      header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    qsa('.mobile-menu a', header).forEach(function (link) {
      link.addEventListener('click', function () {
        header.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Panier ---------- */
  var Cart = {
    drawer: function () { return qs('[data-cart-drawer]'); },
    sectionId: function () {
      var d = this.drawer();
      return d ? d.getAttribute('data-section-id') : null;
    },
    open: function () {
      var d = this.drawer();
      if (!d) { window.location.href = routes.cart; return; }
      d.classList.add('is-open');
      d.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      var close = qs('[data-cart-close].cart-drawer__close', d);
      if (close) setTimeout(function () { close.focus(); }, 50);
    },
    close: function () {
      var d = this.drawer();
      if (!d) return;
      d.classList.remove('is-open');
      d.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
    },
    render: function (sections) {
      var id = this.sectionId();
      if (!sections || !id || !sections[id]) return;
      var doc = new DOMParser().parseFromString(sections[id], 'text/html');
      var fresh = qs('.cart-drawer__panel', doc);
      var panel = qs('.cart-drawer__panel', this.drawer());
      if (fresh && panel) panel.innerHTML = fresh.innerHTML;
      var count = fresh ? fresh.getAttribute('data-cart-count') : null;
      if (count !== null) this.setCount(count);
    },
    setCount: function (count) {
      var panel = qs('.cart-drawer__panel', this.drawer());
      if (panel) panel.setAttribute('data-cart-count', count);
      qsa('[data-cart-bubble]').forEach(function (el) { el.textContent = count; });
    },
    loading: function (state) {
      var d = this.drawer();
      if (d) d.classList.toggle('is-loading', !!state);
    },
    request: function (url, body) {
      var id = this.sectionId();
      if (id) {
        body.sections = [id];
        body.sections_url = window.location.pathname;
      }
      return fetch(url + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || data.status) { throw data; }
          return data;
        });
      });
    },
    add: function (items) {
      var self = this;
      return this.request(routes.cartAdd, { items: items }).then(function (data) {
        self.render(data.sections);
        if (theme.cartDrawerEnabled !== false) self.open();
        else window.location.href = routes.cart;
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));
        return data;
      });
    },
    change: function (line, quantity) {
      var self = this;
      self.loading(true);
      return this.request(routes.cartChange, { line: line, quantity: quantity }).then(function (data) {
        self.render(data.sections);
        self.loading(false);
      }).catch(function (err) {
        self.loading(false);
        var box = qs('[data-cart-error]', self.drawer());
        if (box) box.textContent = (err && (err.description || err.message)) || strings.error || 'Erreur';
      });
    }
  };
  theme.Cart = Cart;

  function initCart() {
    document.addEventListener('click', function (e) {
      var openBtn = e.target.closest('[data-cart-open]');
      if (openBtn && Cart.drawer()) { e.preventDefault(); Cart.open(); return; }

      if (e.target.closest('[data-cart-close]')) { e.preventDefault(); Cart.close(); return; }

      var change = e.target.closest('[data-line-change]');
      if (change) {
        e.preventDefault();
        Cart.change(parseInt(change.getAttribute('data-line'), 10), parseInt(change.getAttribute('data-quantity'), 10));
        return;
      }

      var quick = e.target.closest('[data-quick-add]');
      if (quick) {
        e.preventDefault();
        var vid = quick.getAttribute('data-quick-add');
        if (!vid) return;
        quick.setAttribute('disabled', 'disabled');
        Cart.add([{ id: parseInt(vid, 10), quantity: 1 }]).catch(function (err) {
          window.alert((err && err.description) || strings.error);
        }).then(function () { quick.removeAttribute('disabled'); });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') Cart.close();
    });

    document.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-product-form]');
      if (!form || !Cart.drawer()) return;
      e.preventDefault();
      var fd = new FormData(form);
      var id = fd.get('id');
      if (!id) return;
      var buttons = qsa('button[type="submit"]', form).concat(qsa('button[form="' + form.id + '"]'));
      var error = qs('[data-form-error]', form.closest('[data-product]') || form);
      buttons.forEach(function (b) { b.setAttribute('disabled', 'disabled'); b.classList.add('is-loading'); });
      if (error) error.textContent = '';
      var item = { id: parseInt(id, 10), quantity: parseInt(fd.get('quantity') || '1', 10) };
      var props = {};
      fd.forEach(function (value, key) {
        var m = key.match(/^properties\[(.+)\]$/);
        if (m && value) props[m[1]] = value;
      });
      if (Object.keys(props).length) item.properties = props;
      Cart.add([item]).catch(function (err) {
        if (error) error.textContent = (err && (err.description || err.message)) || strings.error;
      }).then(function () {
        buttons.forEach(function (b) {
          b.classList.remove('is-loading');
          if (!b.hasAttribute('data-sold-out')) b.removeAttribute('disabled');
        });
      });
    });
  }

  /* ---------- Fiche produit ---------- */
  function initProduct(scope) {
    var section = scope;
    var form = qs('[data-product-form]', section);
    if (!form) return;
    var moneyFormat = section.getAttribute('data-money-format');
    var variantsEl = qs('[data-product-variants]', section);
    var variants = [];
    try { variants = variantsEl ? JSON.parse(variantsEl.textContent) : []; } catch (err) { variants = []; }
    var idInput = qs('input[name="id"][type="hidden"]', form);

    function update(variant) {
      if (!variant) return;
      qsa('[data-sticky-price], [data-product-price]', section).forEach(function (el) { el.textContent = formatMoney(variant.price, moneyFormat); });
      qsa('[data-product-compare]', section).forEach(function (el) {
        if (variant.compare_at_price && variant.compare_at_price > variant.price) {
          el.textContent = formatMoney(variant.compare_at_price, moneyFormat);
          el.hidden = false;
        } else {
          el.hidden = true;
        }
      });
      qsa('[data-add-button]', section).forEach(function (btn) {
        var label = qs('[data-add-label]', btn) || btn;
        if (variant.available) {
          btn.removeAttribute('disabled');
          btn.removeAttribute('data-sold-out');
          label.textContent = btn.getAttribute('data-label') || strings.addToCart;
        } else {
          btn.setAttribute('disabled', 'disabled');
          btn.setAttribute('data-sold-out', '');
          label.textContent = strings.soldOut;
        }
      });
      if (variant.featured_media) {
        var slide = qs('[data-gallery-slide][data-media-id="' + variant.featured_media.id + '"]', section);
        if (slide) showSlide(section, slide.getAttribute('data-media-id'));
      }
      if (history.replaceState && section.hasAttribute('data-update-url')) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        history.replaceState({}, '', url.toString());
      }
    }

    // Offres en sachets (radios name="id")
    qsa('[data-offer-input]', section).forEach(function (input) {
      input.addEventListener('change', function () {
        var v = variants.filter(function (x) { return String(x.id) === input.value; })[0];
        update(v);
      });
    });

    // Sélecteur d'options
    var picker = qs('[data-variant-picker]', section);
    if (picker && idInput) {
      picker.addEventListener('change', function () {
        var selected = qsa('fieldset[data-option-index]', picker).map(function (fs) {
          var checked = qs('input:checked', fs);
          return checked ? checked.value : null;
        });
        var match = variants.filter(function (v) {
          return selected.every(function (val, i) { return val === null || v.options[i] === val; });
        })[0];
        if (match) {
          idInput.value = match.id;
          update(match);
        } else {
          qsa('[data-add-button]', section).forEach(function (btn) {
            btn.setAttribute('disabled', 'disabled');
            var label = qs('[data-add-label]', btn) || btn;
            label.textContent = strings.unavailable;
          });
        }
      });
    }

    // Galerie
    qsa('[data-gallery-thumb]', section).forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        showSlide(section, thumb.getAttribute('data-media-id'));
      });
    });
  }

  function showSlide(section, mediaId) {
    var slides = qsa('[data-gallery-slide]', section);
    if (!slides.length) return;
    var target = slides.filter(function (s) { return s.getAttribute('data-media-id') === mediaId; })[0];
    if (!target) return;
    slides.forEach(function (s) { s.classList.toggle('is-active', s === target); });
    qsa('[data-gallery-thumb]', section).forEach(function (t) {
      t.classList.toggle('is-active', t.getAttribute('data-media-id') === mediaId);
    });
  }

  function initProducts() {
    qsa('[data-product]').forEach(initProduct);
  }

  /* ---------- Init ---------- */
  function init() {
    measure();
    onScroll();
    initMenu();
    initCart();
    initProducts();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Éditeur de thème : réinitialiser après rechargement d'une section
  document.addEventListener('shopify:section:load', function (e) {
    measure();
    qsa('[data-product]', e.target).forEach(initProduct);
    if (e.target.querySelector('.site-header')) initMenu();
  });
  document.addEventListener('shopify:section:select', function (e) {
    if (e.target.querySelector('[data-cart-drawer]')) Cart.open();
  });
  document.addEventListener('shopify:section:deselect', function (e) {
    if (e.target.querySelector('[data-cart-drawer]')) Cart.close();
  });

  window.theme = theme;
})();
