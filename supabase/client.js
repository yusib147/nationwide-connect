/* Nationwide Connect data layer.
   DEMO MODE (localStorage) while SUPABASE_URL / SUPABASE_ANON_KEY are empty
   in config.js. With keys set it runs in SUPABASE MODE:
   - categories and products are read live from Supabase (seed listings are
     merged in so the feed stays rich)
   - auth is email + password via Supabase Auth; phone is an optional
     profile contact field, never the login credential
   The app calls the same functions either way. */
(function () {
  "use strict";

  var cfg = window.NM_CONFIG || {};
  var live = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

  /* ---------- tiny demo password hash (demo only, not real security) ---------- */
  function hashPw(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h * 31) + s.charCodeAt(i)) >>> 0; }
    return "d" + h.toString(16);
  }

  function toE164(p) {
    var d = String(p || "").replace(/\D/g, "");
    if (d.indexOf("234") === 0) { d = d.slice(3); }
    else if (d.charAt(0) === "0") { d = d.slice(1); }
    return "+234" + d;
  }

  function isUuid(s) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ""));
  }

  /* Supabase has no SMS provider on this project yet, so any phone OTP
     attempt fails fast with provider-disabled. Detect that and fall back. */
  function otpNotConfigured(err) {
    var m = String((err && (err.message || err.msg)) || err || "").toLowerCase();
    var code = String((err && (err.code || err.error_code)) || "").toLowerCase();
    return /phone_provider_disabled|unsupported phone|phone provider|provider is not configured|not enabled|sms/.test(m) ||
      code.indexOf("phone_provider_disabled") >= 0;
  }

  /* ---------- localStorage demo store ---------- */
  var LS = {
    get: function (k, fb) {
      try {
        var v = localStorage.getItem(k);
        return v ? JSON.parse(v) : fb;
      } catch (e) { return fb; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  var K = {
    users: "nm_users",
    session: "nm_session",
    products: "nm_products",
    convos: "nm_convos"
  };

  /* ---------- demo auth (used in demo mode, and as fallback in
     supabase mode while SMS login is not configured) ---------- */
  function demoSignUp(name, phone, password) {
    return new Promise(function (resolve, reject) {
      var users = LS.get(K.users, []);
      for (var i = 0; i < users.length; i++) {
        if (users[i].phone === phone) { reject(new Error("This number already has an account. Log in instead.")); return; }
      }
      users.push({ name: name, phone: phone, pass: hashPw(password), at: Date.now() });
      LS.set(K.users, users);
      LS.set(K.session, { phone: phone });
      resolve({ phone: phone, name: name });
    });
  }
  function demoSignIn(phone, password) {
    return new Promise(function (resolve, reject) {
      var users = LS.get(K.users, []);
      var found = null;
      for (var i = 0; i < users.length; i++) {
        if (users[i].phone === phone) { found = users[i]; }
      }
      if (!found || found.pass !== hashPw(password)) {
        reject(new Error("Wrong number or password. Try again."));
        return;
      }
      LS.set(K.session, { phone: phone });
      resolve({ phone: found.phone, name: found.name });
    });
  }
  function demoSignOut() { LS.del(K.session); return Promise.resolve(); }
  function demoCurrentUser() {
    var s = LS.get(K.session, null);
    if (!s) { return Promise.resolve(null); }
    var users = LS.get(K.users, []);
    for (var i = 0; i < users.length; i++) {
      if (users[i].phone === s.phone) {
        return Promise.resolve({ phone: users[i].phone, name: users[i].name, demo: true });
      }
    }
    return Promise.resolve(null);
  }

  /* ---------- seller auto replies (demo chat, so chat stays testable) ---------- */
  var SELLER_LINES = [
    "Hello, thanks for your message. The item is still available.",
    "Yes it is available. When would you like to see it?",
    "The price is slightly negotiable for a serious buyer.",
    "You can come and inspect it any time. Just let me know when.",
    "I am in town all week. Tell me what time works for you."
  ];

  function scheduleSellerReply(convoId) {
    var convos = LS.get(K.convos, []);
    var c = null;
    for (var i = 0; i < convos.length; i++) {
      if (convos[i].id === convoId) { c = convos[i]; }
    }
    if (!c) { return; }
    var n = c.messages.filter(function (m) { return m.from === "buyer"; }).length;
    var line = SELLER_LINES[Math.min(n - 1, SELLER_LINES.length - 1)];
    setTimeout(function () {
      var all = LS.get(K.convos, []);
      for (var j = 0; j < all.length; j++) {
        if (all[j].id === convoId) {
          all[j].messages.push({ from: "seller", text: line, at: Date.now() });
          all[j].updatedAt = Date.now();
        }
      }
      LS.set(K.convos, all);
      if (window.NM && typeof window.NM.onExternalMessage === "function") {
        window.NM.onExternalMessage(convoId);
      }
    }, 2200);
  }

  /* ---------- category slug map (Supabase seeds these 7 names) ---------- */
  var CAT_SLUG_BY_NAME = {
    "Vehicles": "vehicles",
    "Phones and Tablets": "phones",
    "Electronics": "electronics",
    "Furniture": "furniture",
    "Fashion": "fashion",
    "Property": "property",
    "Services": "services"
  };
  var _catsCache = null;

  function mapProductRow(r) {
    var catName = (r.categories && r.categories.name) || "";
    var prof = r.profiles || r.seller || {};
    return {
      id: r.id,
      title: r.title,
      price: Number(r.price),
      priceSuffix: r.price_suffix || "",
      category: CAT_SLUG_BY_NAME[catName] || "services",
      categoryName: catName,
      description: r.description || "",
      location: r.location || "",
      condition: r.condition || "Used",
      sellerName: prof.display_name || "Seller",
      sellerPhone: prof.phone || "",
      sellerAvatar: prof.avatar_url || "",
      sellerId: r.seller_id || null,
      images: r.image_urls || [],
      at: r.created_at ? Date.parse(r.created_at) : Date.now(),
      live: true
    };
  }

  function filterSeeds(filter) {
    filter = filter || {};
    var seeds = window.NM_SEEDS || [];
    return seeds.filter(function (p) {
      if (filter.category && p.category !== filter.category) { return false; }
      if (filter.query) {
        var q = filter.query.toLowerCase();
        if ((p.title + " " + p.description + " " + p.location).toLowerCase().indexOf(q) < 0) { return false; }
      }
      if (filter.seller && p.sellerPhone !== filter.seller) { return false; }
      return true;
    });
  }

  function filterMapped(list, filter) {
    filter = filter || {};
    return list.filter(function (p) {
      if (filter.category && p.category !== filter.category) { return false; }
      if (filter.query) {
        var q = filter.query.toLowerCase();
        if ((p.title + " " + (p.description || "") + " " + (p.location || "")).toLowerCase().indexOf(q) < 0) { return false; }
      }
      if (filter.sellerId) {
        if (p.sellerId !== filter.sellerId) { return false; }
      } else if (filter.seller && p.sellerPhone !== filter.seller) { return false; }
      return true;
    });
  }

  /* ---------- public API ---------- */
  var DB = {
    mode: live ? "supabase" : "demo",
    client: null,

    init: function () {
      var self = this;
      return new Promise(function (resolve) {
        if (!live) { resolve(); return; }
        if (typeof document === "undefined") { resolve(); return; }
        var s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        s.onload = function () {
          try {
            self.client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
          } catch (e) { self.mode = "demo"; }
          resolve();
        };
        s.onerror = function () { self.mode = "demo"; resolve(); };
        document.head.appendChild(s);
      });
    },

    /* ----- categories: live from Supabase, cached ----- */
    listCategories: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) {
        return Promise.resolve([]);
      }
      if (_catsCache) { return Promise.resolve(_catsCache); }
      return self.client.from("categories").select("id,name,icon").order("id").then(function (res) {
        if (res.error) { throw res.error; }
        _catsCache = (res.data || []).map(function (c) {
          return { id: c.id, name: c.name, icon: c.icon, slug: CAT_SLUG_BY_NAME[c.name] || "services" };
        });
        return _catsCache;
      });
    },

    _catIdForSlug: function (slug) {
      return this.listCategories().then(function (cats) {
        for (var i = 0; i < cats.length; i++) {
          if (cats[i].slug === slug) { return cats[i].id; }
        }
        return cats.length ? cats[0].id : null;
      });
    },

    _sbUser: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve(null); }
      return self.client.auth.getUser().then(function (res) {
        return res.data.user || null;
      }).catch(function () { return null; });
    },

    _ensureProfile: function (u, phone, name) {
      var self = this;
      if (!u || !self.client) { return Promise.resolve(); }
      var meta = u.user_metadata || {};
      var row = { id: u.id, display_name: name || meta.display_name || u.email || "Member" };
      var ph = (phone !== undefined && phone !== null && phone !== "") ? phone : (meta.phone || null);
      if (ph) { row.phone = ph; }
      /* best effort: never break auth on a profile write */
      return self.client.from("profiles").upsert(row, { onConflict: "id" }).then(function () {}, function () {});
    },

    /* ----- auth: email + password. Phone is a profile contact field only. ----- */
    signUp: function (name, email, phone, password) {
      var self = this;
      if (self.mode === "demo" || !self.client) { return demoSignUp(name, phone || email, password); }
      return self.client.auth.signUp({
        email: email,
        password: password,
        options: { data: { display_name: name, phone: phone || "" } }
      }).then(function (res) {
        if (res.error) { throw res.error; }
        var u = res.data.user;
        if (!u) { throw new Error("Could not create your account. Try again."); }
        if (res.data.session) {
          return self._ensureProfile(u, phone, name).then(function () {
            return { id: u.id, email: u.email, phone: phone || "", name: name, supabase: true };
          });
        }
        /* Email confirmation is still on: account created, user confirms first. */
        return { email: email, name: name, confirmNotice: "Account created. Check your email to confirm it, then log in." };
      });
    },

    signIn: function (email, password) {
      var self = this;
      if (self.mode === "demo" || !self.client) { return demoSignIn(email, password); }
      return self.client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
        if (res.error) { throw res.error; }
        var u = res.data.user;
        return self._ensureProfile(u).then(function () {
          var meta = u.user_metadata || {};
          return {
            id: u.id,
            email: u.email || "",
            phone: u.phone || meta.phone || "",
            name: meta.display_name || u.email || "Member",
            supabase: true
          };
        });
      });
    },

    signOut: function () {
      var self = this;
      /* Full local clear first so no cached user can reappear. */
      LS.del(K.session);
      _catsCache = null;
      if (self.mode === "demo" || !self.client) { return Promise.resolve(); }
      return self.client.auth.signOut().then(function () {}, function () {}).then(function () {
        return self.client.auth.getSession();
      }).then(function (res) {
        if (res.data && res.data.session) { throw new Error("Could not log out. Try again."); }
      });
    },

    currentUser: function () {
      var self = this;
      if (self.mode === "demo" || !self.client) { return demoCurrentUser(); }
      return self._sbUser().then(function (u) {
        if (!u) { return Promise.resolve(null); }
        var meta = u.user_metadata || {};
        /* best effort profile row for OAuth users too */
        self._ensureProfile(u);
        return self.client.from("profiles").select("display_name,phone,address,avatar_url").eq("id", u.id).maybeSingle().then(function (pr) {
          var prof = (pr && pr.data) || {};
          return {
            id: u.id,
            email: u.email || "",
            phone: prof.phone || u.phone || meta.phone || "",
            address: prof.address || "",
            avatarUrl: prof.avatar_url || "",
            name: prof.display_name || meta.display_name || u.email || "Member",
            supabase: true
          };
        });
      });
    },

    /* ----- products ----- */
    listProducts: function (filter) {
      filter = filter || {};
      var self = this;
      if (self.mode === "demo" || !self.client) {
        var mine = LS.get(K.products, []);
        var all = (window.NM_SEEDS || []).concat(mine);
        return Promise.resolve(filterMapped(all, filter).sort(function (a, b) { return b.at - a.at; }));
      }
      /* Supabase mode: live rows + seed listings + anything posted in demo
         before the switch, merged newest first. Never breaks the feed. */
      return self.client.from("products")
        .select("*, categories(name), profiles(display_name,phone,avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200)
        .then(function (res) {
          if (res.error) { throw res.error; }
          return (res.data || []).map(mapProductRow);
        })
        .then(function (rows) {
          var mine = LS.get(K.products, []);
          var merged = filterMapped(rows, filter)
            .concat(filterMapped(mine, filter))
            .concat(filterSeeds(filter));
          merged.sort(function (a, b) { return b.at - a.at; });
          return merged;
        })
        .catch(function () {
          /* Supabase unreachable: seeds keep the feed alive. */
          return filterSeeds(filter).sort(function (a, b) { return b.at - a.at; });
        });
    },

    createProduct: function (data) {
      var self = this;
      if (self.mode === "demo" || !self.client) {
        return demoCurrentUser().then(function (u) {
          if (!u) { throw new Error("Log in to post an item."); }
          var mine = LS.get(K.products, []);
          var p = {
            id: "u" + Date.now(),
            title: data.title,
            price: Number(data.price),
            priceSuffix: data.priceSuffix || "",
            category: data.category,
            description: data.description,
            location: data.location || "",
            condition: data.condition || "Used",
            sellerName: u.name,
            sellerPhone: u.phone,
            at: Date.now()
          };
          mine.push(p);
          LS.set(K.products, mine);
          return p;
        });
      }
      /* Supabase mode: needs a real Supabase session for the RLS policy. */
      return self._sbUser().then(function (u) {
        if (!u) { throw new Error("Log in to post an item."); }
        return self._catIdForSlug(data.category).then(function (catId) {
          return self.client.from("products").insert({
            seller_id: u.id,
            title: data.title,
            price: Number(data.price),
            price_suffix: data.priceSuffix || "",
            category_id: catId,
            description: data.description,
            location: data.location || "",
            condition: data.condition || "Used",
            status: "active"
          }).select("id").single();
        }).then(function (res) {
          if (res.error) { throw res.error; }
          var pid = res.data.id;
          var photos = data.photoBlobs || [];
          if (!photos.length) { return self._getProduct(pid); }
          /* Photos upload after the row exists; a storage failure must
             never kill the listing. */
          return self.uploadProductPhotos(pid, photos).then(function () {
            return self._getProduct(pid);
          }, function (err) {
            var e = new Error("STORAGE_BLOCKED:" + (err.message || "upload failed"));
            e.productId = pid;
            throw e;
          });
        });
      });
    },

    _getProduct: function (pid) {
      var self = this;
      return self.client.from("products")
        .select("*, categories(name), profiles(display_name,phone,avatar_url)")
        .eq("id", pid).single().then(function (res) {
          if (res.error) { throw res.error; }
          return mapProductRow(res.data);
        });
    },

    /* ----- product photos: up to 9, compressed client side ----- */
    uploadProductPhotos: function (productId, blobs) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Photo upload needs a connection.")); }
      var urls = [];
      var chain = Promise.resolve();
      blobs.slice(0, 9).forEach(function (blob, i) {
        chain = chain.then(function () {
          var path = "products/" + productId + "/" + i + ".jpg";
          return self.client.storage.from("product-images").upload(path, blob, {
            contentType: "image/jpeg", upsert: true
          }).then(function (res) {
            if (res.error) { throw res.error; }
            var pub = self.client.storage.from("product-images").getPublicUrl(path);
            urls.push(pub.data.publicUrl);
          });
        });
      });
      return chain.then(function () {
        if (!urls.length) { return urls; }
        return self.client.from("products").update({ image_urls: urls }).eq("id", productId).then(function (res) {
          if (res.error) { throw res.error; }
          return urls;
        });
      });
    },

    /* ----- avatar: square crop client side, one file per user ----- */
    uploadAvatar: function (blob) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Avatar upload needs a connection.")); }
      return self._sbUser().then(function (u) {
        if (!u) { throw new Error("Log in first."); }
        var path = "avatars/" + u.id + ".jpg";
        return self.client.storage.from("avatars").upload(path, blob, {
          contentType: "image/jpeg", upsert: true
        }).then(function (res) {
          if (res.error) { throw res.error; }
          var pub = self.client.storage.from("avatars").getPublicUrl(path);
          var url = pub.data.publicUrl;
          return self.client.from("profiles").upsert({ id: u.id, avatar_url: url }, { onConflict: "id" }).then(function (pr) {
            if (pr.error) { throw pr.error; }
            return url;
          });
        });
      });
    },

    /* ----- profile details ----- */
    updateProfile: function (fields) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Profile update needs a connection.")); }
      return self._sbUser().then(function (u) {
        if (!u) { throw new Error("Log in first."); }
        var row = { id: u.id };
        if (fields.display_name !== undefined) { row.display_name = fields.display_name; }
        if (fields.phone !== undefined) { row.phone = fields.phone || null; }
        if (fields.address !== undefined) { row.address = fields.address || null; }
        if (fields.avatar_url !== undefined) { row.avatar_url = fields.avatar_url || null; }
        return self.client.from("profiles").upsert(row, { onConflict: "id" }).then(function (res) {
          if (res.error) { throw res.error; }
        });
      });
    },

    getProfile: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve(null); }
      return self._sbUser().then(function (u) {
        if (!u) { return Promise.resolve(null); }
        return self.client.from("profiles").select("display_name,phone,address,avatar_url").eq("id", u.id).maybeSingle().then(function (res) {
          return (res && res.data) || null;
        });
      });
    },

    /* ----- Google OAuth (provider configured in dashboard separately) ----- */
    signInWithGoogle: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) {
        return Promise.reject(new Error("Google login is being set up. Use email for now."));
      }
      var redirectTo = window.location.href.split("#")[0].split("?")[0];
      return self.client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo }
      }).then(function (res) {
        if (res.error) { throw res.error; }
        return res;
      }).catch(function (err) {
        var m = String((err && err.message) || "").toLowerCase();
        if (m.indexOf("provider") >= 0 && (m.indexOf("not enabled") >= 0 || m.indexOf("disabled") >= 0 || m.indexOf("unsupported") >= 0)) {
          throw new Error("Google login is being set up. Use email for now.");
        }
        throw err;
      });
    },

    /* ----- conversations ----- */
    _localConvos: function () {
      var self = this;
      return demoCurrentUser().then(function (u) {
        if (!u) { return []; }
        return LS.get(K.convos, []).filter(function (c) {
          return c.buyerPhone === u.phone || c.sellerPhone === u.phone;
        }).sort(function (a, b) { return b.updatedAt - a.updatedAt; });
      });
    },

    openConversation: function (productId) {
      var self = this;
      /* Local chat engine for seed items or when there is no Supabase session. */
      function localOpen() {
        return demoCurrentUser().then(function (u) {
          if (!u) { throw new Error("Log in to chat with sellers."); }
          var prod = (window.NM_SEEDS || []).concat(LS.get(K.products, [])).filter(function (p) { return String(p.id) === String(productId); })[0];
          if (!prod) { throw new Error("Item not found."); }
          if (prod.sellerPhone && prod.sellerPhone === u.phone) { throw new Error("This is your own item."); }
          var convos = LS.get(K.convos, []);
          for (var i = 0; i < convos.length; i++) {
            if (String(convos[i].productId) === String(productId) && convos[i].buyerPhone === u.phone) {
              return convos[i].id;
            }
          }
          var c = {
            id: "c" + Date.now(),
            productId: productId,
            productTitle: prod.title,
            productPrice: prod.price,
            productCat: prod.category,
            sellerName: prod.sellerName,
            sellerPhone: prod.sellerPhone,
            buyerPhone: u.phone,
            buyerName: u.name,
            messages: [],
            updatedAt: Date.now()
          };
          convos.push(c);
          LS.set(K.convos, convos);
          return c.id;
        });
      }
      if (self.mode === "demo" || !self.client || !isUuid(productId)) { return localOpen(); }
      return self._sbUser().then(function (u) {
        if (!u) { return localOpen(); }
        return self.client.from("products").select("id,seller_id").eq("id", productId).maybeSingle().then(function (pr) {
          if (pr.error) { throw pr.error; }
          if (!pr.data) { return localOpen(); }
          if (pr.data.seller_id === u.id) { throw new Error("This is your own item."); }
          return self.client.from("conversations").select("id")
            .eq("product_id", productId).eq("buyer_id", u.id).maybeSingle().then(function (ex) {
              if (ex.error) { throw ex.error; }
              if (ex.data) { return ex.data.id; }
              return self.client.from("conversations").insert({
                product_id: productId, buyer_id: u.id, seller_id: pr.data.seller_id
              }).select("id").single().then(function (ins) {
                if (ins.error) { throw ins.error; }
                return ins.data.id;
              });
            });
        });
      });
    },

    listConversations: function () {
      var self = this;
      var localP = self._localConvos();
      if (self.mode === "demo" || !self.client) { return localP; }
      return self._sbUser().then(function (u) {
        if (!u) { return localP; }
        return self.client.from("conversations")
          .select("id,product_id,buyer_id,seller_id,updated_at," +
            "products!inner(title,price,categories(name))," +
            "buyer:profiles!conversations_buyer_id_fkey(display_name,phone,avatar_url)," +
            "seller:profiles!conversations_seller_id_fkey(display_name,phone,avatar_url)")
          .or("buyer_id.eq." + u.id + ",seller_id.eq." + u.id)
          .order("updated_at", { ascending: false })
          .then(function (res) {
            if (res.error) { throw res.error; }
            var ids = (res.data || []).map(function (c) { return c.id; });
            var msgP = ids.length ? self.client.from("messages")
              .select("conversation_id,body,created_at,sender_id")
              .in("conversation_id", ids).order("created_at", { ascending: false })
              : Promise.resolve({ data: [] });
            return msgP.then(function (mr) {
              var lastBy = {};
              (mr.data || []).forEach(function (m) {
                if (!lastBy[m.conversation_id]) {
                  lastBy[m.conversation_id] = { text: m.body, at: Date.parse(m.created_at) };
                }
              });
              var live = (res.data || []).map(function (c) {
                var prod = c.products || {};
                var other = (c.buyer_id === u.id) ? (c.seller || {}) : (c.buyer || {});
                var last = lastBy[c.id];
                return {
                  id: c.id,
                  productId: c.product_id,
                  productTitle: prod.title || "",
                  productPrice: Number(prod.price || 0),
                  productCat: CAT_SLUG_BY_NAME[(prod.categories || {}).name] || "services",
                  buyerId: c.buyer_id || null,
                  sellerId: c.seller_id || null,
                  sellerName: (c.seller || {}).display_name || "Seller",
                  sellerPhone: (c.seller || {}).phone || "",
                  buyerPhone: (c.buyer || {}).phone || "",
                  buyerName: (c.buyer || {}).display_name || "",
                  otherName: other.display_name || "Member",
                  otherAvatar: other.avatar_url || "",
                  messages: last ? [{ from: "other", text: last.text, at: last.at }] : [],
                  updatedAt: Date.parse(c.updated_at),
                  live: true
                };
              });
              return localP.then(function (local) {
                return live.concat(local).sort(function (a, b) { return b.updatedAt - a.updatedAt; });
              });
            });
          });
      }).catch(function () { return localP; });
    },

    getConversation: function (id) {
      var self = this;
      function localGet() {
        try {
          var all = LS.get(K.convos, []);
          for (var i = 0; i < all.length; i++) {
            if (String(all[i].id) === String(id)) { return Promise.resolve(all[i]); }
          }
        } catch (e) {}
        return Promise.resolve(null);
      }
      if (self.mode === "demo" || !self.client || !isUuid(id)) { return localGet(); }
      return self._sbUser().then(function (u) {
        if (!u) { return localGet(); }
        return self.client.from("conversations")
          .select("id,product_id,buyer_id,seller_id," +
            "products!inner(title,price,categories(name))," +
            "buyer:profiles!conversations_buyer_id_fkey(display_name,phone,avatar_url)," +
            "seller:profiles!conversations_seller_id_fkey(display_name,phone,avatar_url)")
          .eq("id", id).maybeSingle().then(function (res) {
            if (res.error) { throw res.error; }
            if (!res.data) { return localGet(); }
            var c = res.data;
            return self.client.from("messages").select("sender_id,body,created_at")
              .eq("conversation_id", id).order("created_at", { ascending: true })
              .then(function (mr) {
                if (mr.error) { throw mr.error; }
                var prod = c.products || {};
                return {
                  id: c.id,
                  productId: c.product_id,
                  productTitle: prod.title || "",
                  productPrice: Number(prod.price || 0),
                  productCat: CAT_SLUG_BY_NAME[(prod.categories || {}).name] || "services",
                  buyerId: c.buyer_id || null,
                  sellerId: c.seller_id || null,
                  sellerName: (c.seller || {}).display_name || "Seller",
                  sellerPhone: (c.seller || {}).phone || "",
                  sellerAvatar: (c.seller || {}).avatar_url || "",
                  buyerPhone: (c.buyer || {}).phone || "",
                  buyerName: (c.buyer || {}).display_name || "",
                  buyerAvatar: (c.buyer || {}).avatar_url || "",
                  messages: (mr.data || []).map(function (m) {
                    return {
                      mine: m.sender_id === u.id,
                      text: m.body,
                      at: Date.parse(m.created_at)
                    };
                  }),
                  updatedAt: Date.now(),
                  live: true
                };
              });
          });
      }).catch(function () { return localGet(); });
    },

    sendMessage: function (convoId, text) {
      var self = this;
      function localSend() {
        return demoCurrentUser().then(function (u) {
          var convos = LS.get(K.convos, []);
          var found = false;
          for (var i = 0; i < convos.length; i++) {
            if (String(convos[i].id) === String(convoId)) {
              var who = (convos[i].buyerPhone === u.phone) ? "buyer" : "seller";
              convos[i].messages.push({ from: who, text: text, at: Date.now() });
              convos[i].updatedAt = Date.now();
              found = true;
              if (who === "buyer") { scheduleSellerReply(convos[i].id); }
            }
          }
          if (!found) { throw new Error("Chat not found."); }
          LS.set(K.convos, convos);
        });
      }
      if (self.mode === "demo" || !self.client || !isUuid(convoId)) { return localSend(); }
      return self._sbUser().then(function (u) {
        if (!u) { return localSend(); }
        return self.client.from("messages").insert({
          conversation_id: convoId, sender_id: u.id, body: text
        }).then(function (res) {
          if (res.error) { throw res.error; }
        });
      });
    },

    /* ----- reports ----- */
    fileReport: function (productId, reason) {
      var self = this;
      function localOnly() { return Promise.resolve({ local: true }); }
      if (self.mode !== "supabase" || !self.client) { return localOnly(); }
      return self._sbUser().then(function (u) {
        if (!u) { return localOnly(); }
        return self.client.from("reports").insert({
          reporter_id: u.id, product_id: productId, reason: reason
        }).then(function (res) {
          /* RLS may block the write on some projects; the app still
             hides the listing locally so the reporter is protected. */
          return res.error ? { local: true, dbBlocked: true } : { ok: true };
        });
      }).catch(function () { return { local: true }; });
    },

    /* ----- favorites (logged in users, Supabase) ----- */
    toggleFavorite: function (productId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve({ local: true }); }
      return self._sbUser().then(function (u) {
        if (!u) { throw new Error("Log in to save favorites."); }
        return self.client.from("favorites").select("id").eq("user_id", u.id).eq("product_id", productId).maybeSingle().then(function (ex) {
          if (ex.error) { throw ex.error; }
          if (ex.data) {
            return self.client.from("favorites").delete().eq("id", ex.data.id).then(function (del) {
              if (del.error) { throw del.error; }
              return { favorited: false };
            });
          }
          return self.client.from("favorites").insert({ user_id: u.id, product_id: productId }).then(function (ins) {
            if (ins.error) { throw ins.error; }
            return { favorited: true };
          });
        });
      });
    },
    listFavoriteIds: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve([]); }
      return self._sbUser().then(function (u) {
        if (!u) { return []; }
        return self.client.from("favorites").select("product_id").eq("user_id", u.id).then(function (res) {
          if (res.error) { return []; }
          return (res.data || []).map(function (r) { return r.product_id; });
        });
      });
    },
    mergeLocalFavorites: function (localIds) {
      var self = this;
      if (self.mode !== "supabase" || !self.client || !localIds.length) { return Promise.resolve(0); }
      return self._sbUser().then(function (u) {
        if (!u) { return 0; }
        var rows = localIds.map(function (pid) { return { user_id: u.id, product_id: pid }; });
        return self.client.from("favorites").upsert(rows, { onConflict: "user_id,product_id", ignoreDuplicates: true }).then(function (res) {
          return res.error ? 0 : localIds.length;
        });
      });
    },

    /* ----- offers ----- */
    makeOffer: function (productId, sellerId, amount, expiresAt) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Log in to make an offer.")); }
      return self._sbUser().then(function (u) {
        if (!u) { throw new Error("Log in to make an offer."); }
        return self.client.from("offers").insert({
          product_id: productId, buyer_id: u.id, seller_id: sellerId,
          amount: amount, status: "pending", expires_at: expiresAt
        }).select("id").single().then(function (res) {
          if (res.error) { throw res.error; }
          return res.data;
        });
      });
    },
    listOffersForProduct: function (productId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve([]); }
      return self._sbUser().then(function (u) {
        if (!u) { return []; }
        return self.client.from("offers").select("id,amount,status,expires_at,created_at,buyer_id,seller_id,buyer:profiles!offers_buyer_id_fkey(display_name)").eq("product_id", productId).order("created_at", { ascending: false }).then(function (res) {
          if (res.error) { return []; }
          return res.data || [];
        });
      });
    },
    answerOffer: function (offerId, status, counterAmount) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Log in first.")); }
      var patch = { status: status };
      if (counterAmount) { patch.amount = counterAmount; }
      return self.client.from("offers").update(patch).eq("id", offerId).then(function (res) {
        if (res.error) { throw res.error; }
        return { ok: true };
      });
    },

    /* ----- seller storefront data ----- */
    getProfileById: function (userId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client || !isUuid(userId)) { return Promise.resolve(null); }
      return self.client.from("profiles").select("id,display_name,phone,address,avatar_url,created_at").eq("id", userId).maybeSingle().then(function (res) {
        if (res.error || !res.data) { return null; }
        return res.data;
      });
    },
    sellerMessageStats: function (sellerId) {
      /* Response stats from conversations the viewer participates in.
         Returns { replies, totalMs } for computing "typically replies in X". */
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve(null); }
      return self._sbUser().then(function (u) {
        if (!u) { return null; }
        return self.client.from("conversations").select("id").eq("seller_id", sellerId).then(function (cr) {
          if (cr.error) { return null; }
          var ids = (cr.data || []).map(function (c) { return c.id; });
          if (!ids.length) { return null; }
          return self.client.from("messages").select("conversation_id,sender_id,created_at").in("conversation_id", ids).order("created_at", { ascending: true }).limit(500).then(function (mr) {
            if (mr.error) { return null; }
            var byConvo = {};
            (mr.data || []).forEach(function (m) {
              (byConvo[m.conversation_id] = byConvo[m.conversation_id] || []).push(m);
            });
            var totalMs = 0, replies = 0;
            Object.keys(byConvo).forEach(function (cid) {
              var msgs = byConvo[cid];
              for (var i = 0; i < msgs.length; i++) {
                if (msgs[i].sender_id !== sellerId) {
                  for (var j = i + 1; j < msgs.length; j++) {
                    if (msgs[j].sender_id === sellerId) {
                      totalMs += Date.parse(msgs[j].created_at) - Date.parse(msgs[i].created_at);
                      replies++;
                      break;
                    }
                  }
                }
              }
            });
            return replies ? { replies: replies, avgMs: Math.round(totalMs / replies) } : null;
          });
        });
      });
    },
    markProductSold: function (productId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve({ local: true }); }
      return self.client.from("products").update({ status: "sold" }).eq("id", productId).then(function (res) {
        /* Live RLS currently keeps status pinned to 'active'; the app
           still marks the listing stale locally. */
        return res.error ? { local: true, dbBlocked: true } : { ok: true };
      }).catch(function () { return { local: true }; });
    }
  };

  /* internals exposed for automated tests */
  DB._test = {
    mapProductRow: mapProductRow,
    filterSeeds: filterSeeds,
    filterMapped: filterMapped,
    otpNotConfigured: otpNotConfigured,
    toE164: toE164,
    isUuid: isUuid,
    CAT_SLUG_BY_NAME: CAT_SLUG_BY_NAME
  };

  window.NM_DB = DB;
})();
