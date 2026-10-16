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
      if (!sections || !id || !sections[id]) { this.refreshCount(); return; }
      var doc = new DOMParser().parseFromString(sections[id], 'text/html');
      var fresh = qs('.cart-drawer__panel', doc);
      var panel = qs('.cart-drawer__panel', this.drawer());
      if (fresh && panel) panel.innerHTML = fresh.innerHTML;
      var count = fresh ? fresh.getAttribute('data-cart-count') : null;
      if (count !== null && count !== '') this.setCount(count);
      else this.refreshCount();
    },
    setCount: function (count) {
      var n = parseInt(count, 10);
      if (isNaN(n)) { this.refreshCount(); return; }
      var panel = qs('.cart-drawer__panel', this.drawer());
      if (panel) panel.setAttribute('data-cart-count', n);
      qsa('[data-cart-bubble]').forEach(function (el) {
        el.textContent = String(n);
        el.hidden = n === 0;
      });
    },
    refreshCount: function () {
      var self = this;
      return fetch(routes.cart + '.js', { headers: { 'Accept': 'application/json' } })
        .then(function (res) { return res.json(); })
        .then(function (data) { if (data && typeof data.item_count === 'number') self.setCount(data.item_count); })
        .catch(function () { /* compteur inchangé */ });
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
        qsa('fieldset[data-option-index]', picker).forEach(function (fs) {
          var current = qs('[data-option-current]', fs);
          var checked = qs('input:checked', fs);
          if (current && checked) current.textContent = checked.value;
        });
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

  /* ---------- Composer mon pack ---------- */
  function initPack(root) {
    if (!root || root.hasAttribute('data-pack-ready')) return;
    root.setAttribute('data-pack-ready', '');
    var config = {};
    try { config = JSON.parse(qs('[data-pack-config]', root).textContent); } catch (err) { config = {}; }
    var tiers = (config.tiers || []).slice().sort(function (a, b) { return a.quantity - b.quantity; });
    var max = parseInt(root.getAttribute('data-max'), 10) || 10;
    var minSlots = parseInt(root.getAttribute('data-min-slots'), 10) || 6;
    var storeKey = 'tisanours-pack-' + root.getAttribute('data-section-id');
    var catalog = {};
    var cards = qsa('[data-pack-card]', root);

    cards.forEach(function (card) {
      var data = {};
      try { data = JSON.parse(qs('[data-pack-item]', card).textContent); } catch (err) { return; }
      catalog[data.key] = data;
    });

    var pack = [];
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(storeKey) || '[]');
      pack = saved.filter(function (it) { return it && catalog[it.key]; }).slice(0, max);
    } catch (err) { pack = []; }

    function money(cents) { return formatMoney(Math.round(cents), config.moneyFormat); }
    function plural(n) { return n > 1 ? config.units : config.unit; }
    function save() { try { window.sessionStorage.setItem(storeKey, JSON.stringify(pack)); } catch (err) { /* stockage indisponible */ } }

    function remaining(n) { return n === 1 ? 'qu’1 ' + config.unit : 'que ' + n + ' ' + plural(n); }

    function currentTier(n) {
      var found = null;
      tiers.forEach(function (t) { if (n >= t.quantity) found = t; });
      return found;
    }

    function message(n) {
      var tier = currentTier(n);
      var next = tiers.filter(function (t) { return t.quantity > n; })[0];
      if (!tiers.length) return '';
      if (!tier) {
        var missing = next.quantity - n;
        if (n === 0) return 'Ajoutez ' + next.quantity + ' ' + plural(next.quantity) + ' pour débloquer -' + next.percent + ' %';
        return 'Plus ' + remaining(missing) + ' pour débloquer -' + next.percent + ' %';
      }
      if (!next) return '-' + tier.percent + ' % débloqué, la meilleure réduction';
      var left = next.quantity - n;
      return '-' + tier.percent + ' % débloqué · plus ' + remaining(left) + ' pour -' + next.percent + ' %';
    }

    function slotThumb(item) {
      var data = catalog[item.key];
      var el = document.createElement('div');
      el.className = 'pack-slot__thumb u-' + data.univers + ((item.image || data.image) ? '' : ' ph ph--sm');
      var src = item.image || data.image;
      if (src) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = data.title + (item.label ? ' · ' + item.label : '');
        img.loading = 'lazy';
        el.appendChild(img);
      }
      return el;
    }

    function render() {
      var nEligible = pack.filter(function (it) { return catalog[it.key].eligible; }).length;
      var tier = currentTier(nEligible);
      var pct = tier ? tier.percent : 0;
      var old = 0;
      var now = 0;
      pack.forEach(function (it) {
        var price = it.price;
        old += price;
        now += catalog[it.key].eligible ? price * (1 - pct / 100) : price;
      });

      qsa('[data-pack-tier]', root).forEach(function (el) {
        var q = parseInt(el.getAttribute('data-pack-tier'), 10);
        el.classList.toggle('is-active', !!tier && tier.quantity === q);
        el.classList.toggle('is-reached', nEligible >= q && !(tier && tier.quantity === q));
      });

      cards.forEach(function (card) {
        var key = card.getAttribute('data-key');
        var count = pack.filter(function (it) { return it.key === key; }).length;
        var badge = qs('[data-pack-count]', card);
        if (badge) {
          badge.hidden = count === 0;
          badge.textContent = (config.inPack || '×[count]').replace('[count]', count);
        }
        var add = qs('[data-pack-add]', card);
        if (add) add.disabled = pack.length >= max;
      });

      var slots = qs('[data-pack-slots]', root);
      if (slots) {
        slots.innerHTML = '';
        var total = Math.max(minSlots, pack.length + (pack.length < max ? 1 : 0));
        for (var i = 0; i < total; i++) {
          var slot = document.createElement('div');
          slot.className = 'pack-slot';
          var item = pack[i];
          if (item) {
            slot.classList.add('is-filled', 'u-' + catalog[item.key].univers);
            slot.appendChild(slotThumb(item));
            var rm = document.createElement('button');
            rm.type = 'button';
            rm.className = 'pack-slot__remove';
            rm.setAttribute('data-pack-remove', i);
            rm.setAttribute('aria-label', (config.removeLabel || 'Retirer') + ' : ' + catalog[item.key].title);
            rm.textContent = '✕';
            slot.appendChild(rm);
          } else {
            slot.classList.add('is-empty');
            slot.textContent = '+';
          }
          slots.appendChild(slot);
        }
      }

      var msg = qs('[data-pack-msg]', root);
      if (msg) msg.textContent = pack.length >= max ? config.fullLabel : message(nEligible);
      var nowEl = qs('[data-pack-now]', root);
      if (nowEl) nowEl.textContent = money(now);
      var oldEl = qs('[data-pack-old]', root);
      if (oldEl) oldEl.textContent = pct ? money(old) : '';
      var saveEl = qs('[data-pack-save]', root);
      if (saveEl) saveEl.textContent = pct ? (config.saveLabel || '-[percent] %').replace('[percent]', pct) : config.noDiscountLabel;
      var submit = qs('[data-pack-submit]', root);
      if (submit) submit.disabled = pack.length === 0;
      save();
    }

    cards.forEach(function (card) {
      var key = card.getAttribute('data-key');
      var select = qs('[data-pack-variant]', card);
      if (select) {
        select.addEventListener('change', function () {
          var opt = select.options[select.selectedIndex];
          var priceEl = qs('[data-pack-card-price]', card);
          if (priceEl) priceEl.textContent = money(parseInt(opt.getAttribute('data-price'), 10));
        });
      }
      var add = qs('[data-pack-add]', card);
      if (!add) return;
      add.addEventListener('click', function () {
        if (pack.length >= max) return;
        var data = catalog[key];
        var item = { key: key, variant: data.variant, price: data.price };
        if (select) {
          var opt = select.options[select.selectedIndex];
          item.variant = parseInt(opt.value, 10);
          item.price = parseInt(opt.getAttribute('data-price'), 10);
          item.label = opt.textContent.trim();
          if (opt.getAttribute('data-image')) item.image = opt.getAttribute('data-image');
        }
        pack.push(item);
        render();
      });
    });

    root.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-pack-remove]');
      if (rm) {
        pack.splice(parseInt(rm.getAttribute('data-pack-remove'), 10), 1);
        render();
        return;
      }
      var tab = e.target.closest('[data-pack-tab]');
      if (tab) {
        var group = tab.getAttribute('data-pack-tab');
        qsa('[data-pack-tab]', root).forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        cards.forEach(function (card) {
          card.hidden = group !== 'all' && card.getAttribute('data-group') !== group;
        });
      }
    });

    var submit = qs('[data-pack-submit]', root);
    if (submit) {
      submit.addEventListener('click', function () {
        if (!pack.length) return;
        var byVariant = {};
        var order = [];
        pack.forEach(function (it) {
          if (!byVariant[it.variant]) { byVariant[it.variant] = 0; order.push(it.variant); }
          byVariant[it.variant] += 1;
        });
        var items = order.map(function (id) { return { id: parseInt(id, 10), quantity: byVariant[id] }; });
        var error = qs('[data-pack-error]', root);
        if (error) error.hidden = true;
        submit.disabled = true;
        Cart.add(items).then(function () {
          pack = [];
          render();
        }).catch(function (err) {
          submit.disabled = false;
          if (error) {
            error.textContent = (err && (err.description || err.message)) || strings.error || 'Erreur';
            error.hidden = false;
          }
        });
      });
    }

    render();
  }

  function initPacks(ctx) {
    qsa('[data-pack]', ctx).forEach(initPack);
  }

  /* ---------- Init ---------- */
  function init() {
    measure();
    onScroll();
    initMenu();
    initCart();
    initProducts();
    initPacks();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    // Retour arrière (cache du navigateur) : resynchroniser le compteur du panier
    window.addEventListener('pageshow', function (e) { if (e.persisted) Cart.refreshCount(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // Éditeur de thème : réinitialiser après rechargement d'une section
  document.addEventListener('shopify:section:load', function (e) {
    measure();
    qsa('[data-product]', e.target).forEach(initProduct);
    initPacks(e.target);
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
