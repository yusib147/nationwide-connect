/* Nationwide Media Connect data layer. Demo mode (localStorage) when
   config.js keys are empty; Supabase mode (live data + auth) when set. */
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

  /* No SMS provider on this project yet: phone OTP fails fast; detect + fall back. */
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

  /* ---------- Nigerian phone normalization -> 234... ---------- */
  function normalizePhone(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.length === 11 && d.charAt(0) === "0") { d = "234" + d.slice(1); }
    else if (d.length === 10 && /^[789]/.test(d)) { d = "234" + d; }
    return d;
  }
  function phoneValid(raw) { return /^234[789][01]\d{8}$/.test(normalizePhone(raw)); }
  function looksLikePhone(id) { return /^[+\d][\d\s-]{6,}$/.test(String(id || "").trim()); }
  function isSyntheticEmail(email) { return /@login\.nationwideconnect\.app$/i.test(String(email || "")); }

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
    var line = SELLER_LINES[Math.max(0, Math.min(n - 1, SELLER_LINES.length - 1))] || SELLER_LINES[0];
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

  /* ---------- category slug map (Supabase seeds these 15 names) ---------- */
  var CAT_SLUG_BY_NAME = {
    "Vehicles": "vehicles",
    "Phones and Tablets": "phones",
    "Electronics": "electronics",
    "Furniture": "furniture",
    "Fashion": "fashion",
    "Property": "property",
    "Services": "services",
    "Food, Drinks & Catering": "food",
    "Agriculture & Animals": "agriculture",
    "Health & Wellness": "health",
    "Jobs & Careers": "jobs",
    "Babies & Kids": "babies",
    "Building & Construction": "building",
    "Arts & Crafts": "arts",
    "Religion & Spiritual": "spiritual"
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
      subcategory: r.subcategory || "",
      description: r.description || "",
      location: r.location || "",
      condition: r.condition || "Used",
      sellerName: prof.display_name || "Seller",
      sellerPhone: prof.phone || "",
      sellerAvatar: prof.avatar_url || "",
      sellerId: r.seller_id || null,
      sellerTier: prof.verification_tier || null,
      status: r.status || "active",
      quantity: r.quantity == null ? 1 : r.quantity,
      delivery: r.delivery || "",
      aiFlagReason: r.ai_flag_reason || "",
      images: r.image_urls || [],
      bumpAt: r.bump_at ? Date.parse(r.bump_at) : 0,
      promotedUntil: r.promoted_until ? Date.parse(r.promoted_until) : 0,
      featured: false,
      featuredUntil: 0,
      at: r.created_at ? Date.parse(r.created_at) : Date.now(),
      live: true
    };
  }

  function filterSeeds(filter) {
    filter = filter || {};
    var seeds = window.NM_SEEDS || [];
    if (filter.sellerId) { return []; }
    return seeds.filter(function (p) {
      if (filter.category && p.category !== filter.category) { return false; }
      if (filter.subcategory && p.subcategory !== filter.subcategory) { return false; }
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
      /* Dedupe in-flight auth.getUser() calls; reuse the result for 5s. */
      var now = Date.now();
      if (self._sbU && now - self._sbU.at < 5000) { return Promise.resolve(self._sbU.u); }
      if (self._sbUP) { return self._sbUP; }
      self._sbUP = self.client.auth.getUser().then(function (res) {
        self._sbU = { u: res.data.user || null, at: Date.now() };
        self._sbUP = null;
        return self._sbU.u;
      }).catch(function () { self._sbUP = null; return null; });
      return self._sbUP;
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

    /* ----- auth: name + email + phone + password signup; login by email or phone ----- */
    normalizePhone: normalizePhone,
    phoneValid: phoneValid,

    /* Resolve a phone number to the account email via the email_for_phone RPC. */
    emailForPhone: function (phoneRaw) {
      var self = this;
      var phone = normalizePhone(phoneRaw);
      if (self.mode === "demo" || !self.client) { return Promise.resolve(null); }
      return fetch(self.client.supabaseUrl + "/rest/v1/rpc/email_for_phone", {
        method: "POST",
        headers: {
          "apikey": self.client.supabaseKey,
          "Authorization": "Bearer " + self.client.supabaseKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ p_phone: phone })
      }).then(function (r) {
        if (r.status === 404) {
          var e = new Error("Phone login is still being switched on, use your email for now.");
          e.code = "rpc_missing";
          throw e;
        }
        return r.json().then(function (j) { return { status: r.status, body: j }; });
      }).then(function (res) {
        if (res.status !== 200) { throw new Error("Could not look up that number. Try your email instead."); }
        return res.body || null;
      });
    },

    /* One identifier field: email address or phone number. */
    signInWithIdentifier: function (identifier, password) {
      var self = this;
      var id = String(identifier || "").trim();
      if (self.mode === "demo" || !self.client) {
        if (looksLikePhone(id)) { return demoSignIn(id, password); }
        return Promise.reject(new Error("Use your phone number to log in."));
      }
      if (looksLikePhone(id)) {
        if (!phoneValid(id)) { return Promise.reject(new Error("That phone number does not look like a Nigerian mobile number.")); }
        return self.emailForPhone(id).then(function (email) {
          if (!email) { throw new Error("No account found with this number."); }
          return self.signIn(email, password);
        });
      }
      return self.signIn(id, password);
    },

    resetPassword: function (email) {
      var self = this;
      if (self.mode === "demo" || !self.client) {
        return Promise.reject(new Error("Password reset needs a real account. Log in with your phone number."));
      }
      return self.client.auth.resetPasswordForEmail(email, {
        redirectTo: "https://nationwide-connect-demo1-skepterforge1471-8639s-projects.vercel.app/"
      }).then(function (res) {
        if (res.error) { throw res.error; }
        return true;
      });
    },

    /* Listen for the recovery session the reset link creates. */
    onPasswordRecovery: function (cb) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return; }
      self.client.auth.onAuthStateChange(function (event) {
        if (event === "PASSWORD_RECOVERY") { cb(); }
      });
    },

    setNewPassword: function (password) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) {
        return Promise.reject(new Error("Not available right now."));
      }
      return self.client.auth.updateUser({ password: password }).then(function (res) {
        if (res.error) { throw res.error; }
        return true;
      });
    },

    /* ----- email OTP verification for signup (6-digit code via Supabase Auth email) ----- */
    sendSignupOtp: function (email) {
      var self = this;
      if (self.mode === "demo" || !self.client) {
        return Promise.reject(new Error("Email verification needs a real connection."));
      }
      return self.client.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: true }
      }).then(function (res) {
        if (res.error) { throw res.error; }
        return true;
      });
    },

    /* Verify the OTP code, then finish signup for new users (set password,
       create profile, record terms). Existing users are just logged in. */
    verifySignupOtp: function (email, token, d) {
      var self = this;
      d = d || {};
      if (self.mode === "demo" || !self.client) {
        return Promise.reject(new Error("Email verification needs a real connection."));
      }
      return self.client.auth.verifyOtp({ email: email, token: token, type: "email" }).then(function (res) {
        if (res.error) { throw res.error; }
        var u = res.data.user;
        if (!u) { throw new Error("Could not verify that code. Try again."); }
        return self.client.from("profiles").select("id").eq("id", u.id).maybeSingle().then(function (pr) {
          var isNew = !(pr && pr.data);
          if (!isNew) {
            /* Email already had an account: verified owner, log them in. */
            return { id: u.id, email: u.email, phone: d.phone || "", name: d.name || u.email, supabase: true, isNew: false };
          }
          /* New user: set their chosen password now that the email is proven. */
          return self.client.auth.updateUser({ password: d.pass }).then(function (ur) {
            if (ur.error) { throw ur.error; }
          }).then(function () {
            return self._ensureProfile(u, d.phone, d.name);
          }).then(function () {
            return self._recordTerms(u.id, d.termsVersion);
          }).then(function () {
            return { id: u.id, email: u.email, phone: d.phone || "", name: d.name || u.email, supabase: true, isNew: true };
          });
        });
      });
    },

    /* ----- phone (SMS) OTP: link phone to the signed-in account (phase 2, after email verified).
       Uses updateUser so the SMS goes through the Send SMS hook (Termii). ----- */
    sendPhoneOtp: function (phone) {
      var self = this;
      if (self.mode === "demo" || !self.client) {
        return Promise.reject(new Error("Phone verification needs a real connection."));
      }
      var e164 = "+" + normalizePhone(phone);
      return self.client.auth.updateUser({ phone: e164 }).then(function (res) {
        if (res.error) {
          var m = res.error.message || "";
          if (/already|in use|registered|exists/i.test(m)) {
            throw new Error("This phone number is already linked to another account.");
          }
          throw res.error;
        }
        return true;
      });
    },

    /* Verify the SMS OTP code sent to the phone (phone_change flow after updateUser). */
    verifyPhoneOtp: function (phone, token) {
      var self = this;
      if (self.mode === "demo" || !self.client) {
        return Promise.reject(new Error("Phone verification needs a real connection."));
      }
      var e164 = "+" + normalizePhone(phone);
      return self.client.auth.verifyOtp({ phone: e164, token: token, type: "phone_change" }).then(function (res) {
        if (res.error) { throw res.error; }
        if (!res.data || !res.data.user) { throw new Error("Could not verify that code. Try again."); }
        return true;
      });
    },

    /* Record Terms + Privacy acceptance. Tries profiles columns first
       (needs supabase/terms_acceptance.sql), falls back to user_metadata. */
    _recordTerms: function (userId, version) {
      var self = this;
      var v = version || "1.0";
      var at = new Date().toISOString();
      var row = { terms_accepted_at: at, terms_version: v, privacy_version: v };
      return self.client.from("profiles").update(row).eq("id", userId).then(function (res) {
        if (res.error) { throw res.error; }
      }, function () {
        return self.client.auth.updateUser({
          data: { terms_accepted_at: at, terms_version: v, privacy_version: v }
        }).then(function () {}, function () {});
      });
    },

    signUp: function (name, email, phone, password) {
      var self = this;
      var normPhone = normalizePhone(phone);
      if (!phoneValid(phone)) { return Promise.reject(new Error("Type a valid Nigerian phone number, like 0803 123 4567.")); }
      if (self.mode === "demo" || !self.client) { return demoSignUp(name, normPhone, password); }
      return self.client.auth.signUp({
        email: email,
        password: password,
        options: { data: { display_name: name, phone: normPhone } }
      }).then(function (res) {
        if (res.error) { throw res.error; }
        var u = res.data.user;
        if (!u) { throw new Error("Could not create your account. Try again."); }
        if (res.data.session) {
          return self._ensureProfile(u, normPhone, name).then(function () {
            return { id: u.id, email: u.email, phone: normPhone, name: name, supabase: true };
          });
        }
        /* Email confirmation is still on: account created, user confirms first. */
        return { email: email, name: name, phone: normPhone, confirmNotice: "Account created. Check your email to confirm it, then log in." };
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
            email: isSyntheticEmail(u.email) ? "" : (u.email || ""),
            phone: prof.phone || u.phone || meta.phone || "",
            address: prof.address || "",
            avatarUrl: prof.avatar_url || "",
            name: prof.display_name || meta.display_name || (isSyntheticEmail(u.email) ? "Member" : (u.email || "Member")),
            supabase: true
          };
        });
      });
    },

    /* ----- account status / appeals (auto-suspension) ----- */
    myAccountStatus: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve(null); }
      return self._sbUser().then(function (u) {
        if (!u) { return null; }
        return self.client.from("profiles").select("account_status,status_reason").eq("id", u.id).maybeSingle().then(function (pr) {
          if (!pr || !pr.data) { return null; }
          return { status: pr.data.account_status || "active", reason: pr.data.status_reason || "" };
        });
      }).catch(function () { return null; });
    },
    myOpenAppeal: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve(null); }
      return self._sbUser().then(function (u) {
        if (!u) { return null; }
        return self.client.from("appeals").select("id,created_at").eq("user_id", u.id).eq("status", "open").order("created_at", { ascending: false }).limit(1).maybeSingle().then(function (r) {
          return (r && r.data) || null;
        });
      }).catch(function () { return null; });
    },
    submitAppeal: function (message) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Not available")); }
      return self._sbUser().then(function (u) {
        if (!u) { throw new Error("Not signed in"); }
        return self.client.from("appeals").insert({ user_id: u.id, message: String(message || "").slice(0, 2000) }).then(function (res) {
          if (res.error) { throw res.error; }
          return { ok: true };
        });
      });
    },

    /* ----- products ----- */
    featuredMap: function () {
      var self = this;
      if (self.mode === "demo" || !self.client) { return Promise.resolve({}); }
      if (self._fmap && Date.now() - self._fmapAt < 60000) { return Promise.resolve(self._fmap); }
      return self.client.from("admin_featured").select("product_id,expires_at").then(function (res) {
        var map = {};
        (res.data || []).forEach(function (r) {
          if (!r.expires_at || Date.parse(r.expires_at) > Date.now()) { map[r.product_id] = r.expires_at ? Date.parse(r.expires_at) : 0; }
        });
        self._fmap = map; self._fmapAt = Date.now();
        return map;
      }).catch(function () { return {}; });
    },

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
        .select("*, categories(name), profiles(display_name,phone,avatar_url,verification_tier)")
        .eq("status", "active")
        .order("bump_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(200)
        .then(function (res) {
          if (res.error) { throw res.error; }
          return (res.data || []).map(mapProductRow);
        })
        .then(function (rows) {
          return self.featuredMap().then(function (fmap) {
            rows.forEach(function (r) {
              if (fmap[r.id] !== undefined) { r.featured = true; r.featuredUntil = fmap[r.id]; }
            });
            var mine = LS.get(K.products, []);
            var merged = filterMapped(rows, filter)
              .concat(filterMapped(mine, filter))
              .concat(filterSeeds(filter));
            merged.sort(function (a, b) {
              if (!!a.featured !== !!b.featured) { return a.featured ? -1 : 1; }
              var ba = a.bumpAt || 0, bb = b.bumpAt || 0;
              if ((ba > 0) !== (bb > 0)) { return bb - ba; }
              if (ba && bb) { return bb - ba; }
              return b.at - a.at;
            });
            return self.blockedIds().then(function (ids) {
              return ids.length ? merged.filter(function (r) { return ids.indexOf(String(r.sellerId || "")) < 0; }) : merged;
            }, function () { return merged; });
          });
        })
        .catch(function () {
          /* Supabase unreachable: seeds keep the feed alive. */
          return filterSeeds(filter).sort(function (a, b) { return b.at - a.at; });
        });
    },

    /* Lightweight freshness check: returns the newest active listing time + count.
       Used by the live-refresh loop. Cheap: no joins, no bodies, 1 row + count. */
    latestProductAt: function () {
      var self = this;
      if (self.mode === "demo" || !self.client) {
        var all = (window.NM_SEEDS || []).concat(LS.get(K.products, []));
        var latest = 0;
        all.forEach(function (p) { if (p.at > latest) { latest = p.at; } });
        return Promise.resolve({ latest: latest, count: all.length });
      }
      return self.client.from("products")
        .select("created_at", { count: "exact" })
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .then(function (res) {
          if (res.error) { throw res.error; }
          var latest = res.data && res.data.length ? Date.parse(res.data[0].created_at) : 0;
          return { latest: latest, count: res.count || 0 };
        })
        .catch(function () { return { latest: 0, count: 0 }; });
    },

    /* ----- premium (paid gold): free users get 3 listings, then a subscription ----- */
    FREE_LIMIT: 3,
    _premiumActive: function (prof) {
      if (!prof) { return false; }
      if (prof.premium_until) { return new Date(prof.premium_until) > new Date(); }
      return prof.verification_tier === "gold";
    },
    premiumStatus: function () {
      var self = this;
      if (self.mode === "demo" || !self.client) { return Promise.resolve({ active: true, count: 0, limit: self.FREE_LIMIT, demo: true }); }
      return self._sbUser().then(function (u) {
        if (!u) { return { active: false, count: 0, limit: self.FREE_LIMIT }; }
        return Promise.all([
          self.client.from("profiles").select("verification_tier,premium_until").eq("id", u.id).maybeSingle(),
          self.client.from("products").select("id", { count: "exact" }).eq("seller_id", u.id).limit(1)
        ]).then(function (rs) {
          var prof = (rs[0] && rs[0].data) || {};
          return { active: self._premiumActive(prof), until: prof.premium_until || null, tier: prof.verification_tier || "bronze", count: (rs[1] && rs[1].count) || 0, limit: self.FREE_LIMIT };
        });
      });
    },
    _premiumGate: function () {
      var self = this;
      if (self.mode === "demo" || !self.client) { return Promise.resolve(); }
      return self.premiumStatus().then(function (st) {
        if (!st.active && st.count >= st.limit) {
          if (window.NM_showPremium) { try { window.NM_showPremium(st); } catch (e) {} }
          throw new Error("You have used your " + st.limit + " free listings. Upgrade to Premium to post more items.");
        }
      });
    },
    startPayment: function (plan, targetId) {
      var self = this;
      if (!self.client) { return Promise.reject(new Error("Payments need a connection.")); }
      if (window.NM_manualPay) { return window.NM_manualPay(plan, targetId); }
      return self.client.auth.getSession().then(function (s) {
        var tok = s && s.data && s.data.session && s.data.session.access_token;
        if (!tok) { throw new Error("Log in to pay."); }
        return fetch("/api/pay-init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tok, plan: plan, target_id: targetId || null }) });
      }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok || !j.authorization_url) { throw new Error((j && j.error) || "Could not start payment."); }
        location.href = j.authorization_url;
        return j;
      });
    },
    verifyPayment: function (reference) {
      var self = this;
      if (!self.client) { return Promise.reject(new Error("Payments need a connection.")); }
      return self.client.auth.getSession().then(function (s) {
        var tok = s && s.data && s.data.session && s.data.session.access_token;
        if (!tok) { throw new Error("Log in first."); }
        return fetch("/api/pay-verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tok, reference: reference }) });
      }).then(function (r) { return r.json(); });
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
            subcategory: data.subcategory || "",
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
        return self._premiumGate().then(function () {
        return self._catIdForSlug(data.category).then(function (catId) {
          var row = {
            seller_id: u.id,
            title: data.title,
            price: Number(data.price),
            price_suffix: data.priceSuffix || "",
            category_id: catId,
            description: data.description,
            location: data.location || "",
            condition: data.condition || "Used",
            status: "active",
            quantity: Math.max(0, parseInt(data.quantity, 10) || 1),
            delivery: data.delivery || ""
          };
          if (data.subcategory) { row.subcategory = data.subcategory; }
          return self.client.from("products").insert(row).select("id").single()
            .then(function (res) {
              /* subcategory column may not exist yet: retry without it */
              if (res.error && data.subcategory &&
                  /subcategory/i.test(res.error.message || "")) {
                delete row.subcategory;
                return self.client.from("products").insert(row).select("id").single();
              }
              return res;
            });
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
      });
    },

    _getProduct: function (pid) {
      var self = this;
      return self.client.from("products")
        .select("*, categories(name), profiles(display_name,phone,avatar_url,verification_tier)")
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
        function saveUrl(url) {
          return self.client.from("profiles").upsert({ id: u.id, avatar_url: url }, { onConflict: "id" }).then(function (pr) {
            if (pr.error) { throw pr.error; }
            return url;
          });
        }
        return self.client.storage.from("avatars").upload(path, blob, {
          contentType: "image/jpeg", upsert: true
        }).then(function (res) {
          if (res.error) { throw res.error; }
          var pub = self.client.storage.from("avatars").getPublicUrl(path);
          return saveUrl(pub.data.publicUrl);
        }).catch(function (err) {
          /* Fallback: if storage RLS blocks the upload, store the image
             directly in the profile as a data URL (256px JPEG, ~20KB). */
          var msg = (err && err.message) || "";
          if (/row.level.security|rls|policy/i.test(msg)) {
            return new Promise(function (resolve, reject) {
              var reader = new FileReader();
              reader.onload = function () { saveUrl(reader.result).then(resolve, reject); };
              reader.onerror = function () { reject(new Error("Could not read image.")); };
              reader.readAsDataURL(blob);
            });
          }
          throw err;
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

    /* Local chat identity: demo session user if present, otherwise the
       Supabase session user mapped to a stable local key. Seed/demo listings
       chat through the local engine, so a real logged-in user must resolve
       here too — falling back to demo-only made Chat seller throw
       "Log in to chat with sellers." for logged-in users. */
    _localUser: function () {
      var self = this;
      return demoCurrentUser().then(function (u) {
        if (u) { return u; }
        if (self.mode !== "supabase" || !self.client) { return null; }
        return self.currentUser().then(function (su) {
          if (!su) { return null; }
          return { phone: su.phone || ("sb:" + su.id), name: su.name, id: su.id, supabase: true };
        }).catch(function () { return null; });
      });
    },

    /* ----- conversations ----- */
    _localConvos: function () {
      var self = this;
      return self._localUser().then(function (u) {
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
        return self._localUser().then(function (u) {
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
            "products!inner(title,price,image_urls,categories(name))," +
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
                  productImage: (prod.image_urls && prod.image_urls[0]) || "",
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
              return self.blockedIds().then(function (ids) {
                if (ids.length) { live = live.filter(function (c) { return ids.indexOf(String(c.buyerId === u.id ? c.sellerId : c.buyerId)) < 0; }); }
                return localP.then(function (local) { return live.concat(local).sort(function (a, b) { return b.updatedAt - a.updatedAt; }); });
              }, function () { return localP.then(function (local) { return live.concat(local).sort(function (a, b) { return b.updatedAt - a.updatedAt; }); }); });
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
        /* The conversation row and its messages are independent queries —
           run them in parallel instead of one after the other. */
        var convoP = self.client.from("conversations")
          .select("id,product_id,buyer_id,seller_id," +
            "products!inner(title,price,image_urls,categories(name))," +
            "buyer:profiles!conversations_buyer_id_fkey(display_name,phone,avatar_url)," +
            "seller:profiles!conversations_seller_id_fkey(display_name,phone,avatar_url)")
          .eq("id", id).maybeSingle();
        var msgsP = self.client.from("messages").select("sender_id,body,created_at")
          .eq("conversation_id", id).order("created_at", { ascending: true });
        return Promise.all([convoP, msgsP]).then(function (both) {
          var res = both[0], mr = both[1];
          if (res.error) { throw res.error; }
          if (!res.data) { return localGet(); }
          if (mr.error) { throw mr.error; }
          var c = res.data;
          var prod = c.products || {};
          self.aiScanChat(id);
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
      }).catch(function () { return localGet(); });
    },

    sendMessage: function (convoId, text) {
      var self = this;
      function localSend() {
        return self._localUser().then(function (u) {
          if (!u) { throw new Error("Log in to chat with sellers."); }
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
          self.aiScanChat(convoId);
        });
      });
    },

    /* ----- AI chat scan (automatic scam monitoring) ----- */
    _aiScanAt: {}, _aiWarned: {}, _aiReported: {}, _aiAbuseReported: {},
    aiScan: function (payload) {
      var self = this;
      if (!self.client || !self.client.auth) { return Promise.resolve(null); }
      return self.client.auth.getSession().then(function (s) {
        var tok = s && s.data && s.data.session && s.data.session.access_token;
        if (!tok) { return null; }
        return fetch("/api/ai-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + tok },
          body: JSON.stringify(payload)
        }).then(function (r) { return r.json(); }).catch(function () { return null; });
      }).catch(function () { return null; });
    },
    aiScanChat: function (convoId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client || !isUuid(convoId)) { return; }
      var now = Date.now();
      if (self._aiScanAt[convoId] && now - self._aiScanAt[convoId] < 300000) { return; }
      self._aiScanAt[convoId] = now;
      try {
        self.aiScan({ conversation_id: convoId }).then(function (d) {
          if (!d || !d.verdict) { return; }
          if (d.verdict === "SPAM" && !self._aiWarned[convoId]) {
            self._aiWarned[convoId] = 1;
            var toastFn = window.NM_toast || window.c;
            if (typeof toastFn === "function") {
              toastFn("Safety warning: this chat matches scam patterns. Never pay in advance and never share OTP codes.");
            }
          }
          if (d.verdict === "SPAM" && !self._aiReported[convoId]) {
            self._aiReported[convoId] = 1;
            self.client.from("conversations").select("product_id").eq("id", convoId).maybeSingle().then(function (cr) {
              if (cr && cr.data && cr.data.product_id) {
                self.fileReport(cr.data.product_id, "AI chat scan flagged SPAM (score " + d.spam_score + "): " + (d.reasons || []).join("; ")).catch(function () {});
              }
            });
          }
          if ((d.abuse_score || 0) >= 70 && !self._aiAbuseReported[convoId]) {
            self._aiAbuseReported[convoId] = 1;
            self.client.from("conversations").select("product_id").eq("id", convoId).maybeSingle().then(function (cr) {
              if (cr && cr.data && cr.data.product_id) {
                self.fileReport(cr.data.product_id, "AI chat scan flagged abusive language (abuse score " + d.abuse_score + "): " + (d.reasons || []).join("; ")).catch(function () {});
              }
            });
          }
        }).catch(function () {});
      } catch (e) {}
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
          if (res.error) { throw res.error; }
          return { ok: true };
        });
      });
    },

    fileChatReport: function (opts) {
      var self = this;
      opts = opts || {};
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Connect to the internet to send a report.")); }
      return self._sbUser().then(function (u) {
        if (!u) { throw new Error("Log in to send a report."); }
        var reason = "chat:" + (opts.convoId || "?") + " | peer:" + (opts.peerName || "?") + " | " + (opts.reason || "Other") + (opts.note ? " | note:" + String(opts.note).slice(0, 500) : "");
        return self.client.from("reports").insert({ reporter_id: u.id, product_id: opts.productId || null, reason: reason });
      }).then(function (res) {
        if (res.error) { throw res.error; }
        return { ok: true };
      });
    },
    listNotifications: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve([]); }
      return self._sbUser().then(function (u) {
        if (!u) { return []; }
        return self.client.from("notifications").select("id,kind,title,body,meta,created_at")
          .or("user_id.is.null,user_id.eq." + u.id).order("created_at", { ascending: false }).limit(50);
      }).then(function (res) {
        if (res && res.error) { throw res.error; }
        return (res && res.data) || [];
      }).catch(function () { return []; });
    },
    /* ----- favorites (logged in users, Supabase) ----- */
    toggleFavorite: function (productId) {
      var self = this;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(productId))) { return Promise.resolve({ local: true }); }
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
          return self.client.from("favorites").upsert({ user_id: u.id, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true }).then(function (ins) {
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
        var rows = localIds.filter(function (pid) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(pid)); }).map(function (pid) { return { user_id: u.id, product_id: pid }; });
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
      return self.client.from("offers").update(patch).eq("id", offerId).select("id").then(function (res) {
        if (res.error) { throw res.error; }
        if (!res.data || !res.data.length) { throw new Error("That offer could not be updated. Refresh and try again."); }
        return { ok: true };
      });
    },

    /* ----- seller storefront data ----- */
    getProfileById: function (userId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client || !isUuid(userId)) { return Promise.resolve(null); }
      return self.client.from("profiles").select("id,display_name,phone,address,avatar_url,verification_tier,created_at,bio,cover_url,business_hours,state,lga").eq("id", userId).maybeSingle().then(function (res) {
        if (res.error || !res.data) { return null; }
        return res.data;
      });
    },
    sellerMessageStats: function (sellerId) {
      /* Response stats from conversations the viewer participates in.
         Returns { replies, totalMs } for computing "typically replies in X". */
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve(null); }
      self._smsCache = self._smsCache || {};
      var _hit = self._smsCache[sellerId];
      if (_hit && Date.now() - _hit.at < 300000) { return Promise.resolve(_hit.val); }
      function _done(v) { self._smsCache[sellerId] = { at: Date.now(), val: v }; return v; }
      return self._sbUser().then(function (u) {
        if (!u) { return null; }
        return self.client.from("conversations").select("id").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(20).then(function (cr) {
          if (cr.error) { return null; }
          var ids = (cr.data || []).map(function (c) { return c.id; });
          if (!ids.length) { return null; }
          return self.client.from("messages").select("conversation_id,sender_id,created_at").in("conversation_id", ids).order("created_at", { ascending: true }).limit(500).then(function (mr) {
            if (mr.error) { return null; }
            var byConvo = {};
            (mr.data || []).forEach(function (m) {
              (byConvo[m.conversation_id] = byConvo[m.conversation_id] || []).push(m);
            });
            var deltas = [];
            Object.keys(byConvo).forEach(function (cid) {
              var msgs = byConvo[cid];
              for (var i = 0; i < msgs.length; i++) {
                if (String(msgs[i].sender_id) !== String(sellerId)) {
                  for (var j = i + 1; j < msgs.length; j++) {
                    if (String(msgs[j].sender_id) === String(sellerId)) {
                      deltas.push(Date.parse(msgs[j].created_at) - Date.parse(msgs[i].created_at));
                      break;
                    }
                  }
                  break; /* buyer's first message only */
                }
              }
            });
            if (deltas.length < 3) { return _done(null); }
            deltas.sort(function (a, b) { return a - b; });
            var med = deltas[Math.floor(deltas.length / 2)];
            var avg = Math.round(deltas.reduce(function (a, b) { return a + b; }, 0) / deltas.length);
            return _done({ replies: deltas.length, avgMs: avg, medMs: med });
          });
        });
      });
    },
    markProductSold: function (productId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve({ local: true }); }
      return self.client.from("products").update({ status: "sold" }).eq("id", productId).select("id").then(function (res) {
        if (res.error) { throw res.error; }
        if (!res.data || !res.data.length) { throw new Error("Could not mark this item as sold."); }
        return { ok: true };
      });
    },

    /* ----- promote: sellers bump their listing to the top ----- */
    bumpProduct: function (productId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Log in to promote a listing.")); }
      return self.client.from("products").update({ bump_at: new Date().toISOString() }).eq("id", productId).select("id").then(function (res) {
        if (res.error) { throw res.error; }
        if (!res.data || !res.data.length) { throw new Error("Could not promote this listing."); }
        return { ok: true };
      });
    },
    unbumpProduct: function (productId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Log in to change a listing.")); }
      return self.client.from("products").update({ bump_at: null }).eq("id", productId).select("id").then(function (res) {
        if (res.error) { throw res.error; }
        if (!res.data || !res.data.length) { throw new Error("Could not remove the promotion."); }
        return { ok: true };
      });
    },
    listMyProducts: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve([]); }
      return self._sbUser().then(function (u) {
        if (!u) { return []; }
        return self.client.from("products")
          .select("*, categories(name), profiles(display_name,phone,avatar_url,verification_tier)")
          .eq("seller_id", u.id)
          .order("created_at", { ascending: false })
          .limit(200)
          .then(function (res) {
            if (res.error) { throw res.error; }
            var rows = (res.data || []).map(mapProductRow);
            return self.featuredMap().then(function (fmap) {
              rows.forEach(function (r) {
                if (fmap[r.id] !== undefined) { r.featured = true; r.featuredUntil = fmap[r.id]; }
              });
              return rows;
            });
          });
      });
    },
    deleteProduct: function (productId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Log in to delete a listing.")); }
      return self.client.from("products").delete().eq("id", productId).select("id").then(function (res) {
        if (res.error) { throw res.error; }
        if (!res.data || !res.data.length) { throw new Error("Could not delete this listing."); }
        return { ok: true };
      });
    },

    /* ----- verification tier (profiles.verification_tier) ----- */
    getTier: function (userId) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve(null); }
      return self.client.from("profiles").select("verification_tier").eq("id", userId).maybeSingle().then(function (res) {
        if (res.error || !res.data) { return null; }
        return res.data.verification_tier || null;
      });
    },
    setTier: function (tier) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Log in first.")); }
      return self._sbUser().then(function (u) {
        if (!u) { throw new Error("Log in first."); }
        return self.client.from("profiles").update({ verification_tier: tier }).eq("id", u.id).then(function (res) {
          if (res.error) { throw res.error; }
          return { ok: true, tier: tier };
        });
      });
    },

    /* ----- saved searches (saved_searches table) ----- */
    listSavedSearches: function () {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve([]); }
      return self._sbUser().then(function (u) {
        if (!u) { return []; }
        return self.client.from("saved_searches").select("id,query,category,created_at").eq("user_id", u.id).order("created_at", { ascending: false }).limit(10).then(function (res) {
          if (res.error) { return []; }
          return (res.data || []).map(function (r) {
            return { id: r.id, query: r.query || "", category: r.category || "", createdAt: Date.parse(r.created_at) };
          });
        });
      });
    },
    addSavedSearch: function (query, category) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Log in to save searches.")); }
      return self._sbUser().then(function (u) {
        if (!u) { throw new Error("Log in to save searches."); }
        return self.client.from("saved_searches").insert({ user_id: u.id, query: query || "", category: category || "" }).select("id,query,category,created_at").single().then(function (res) {
          if (res.error) { throw res.error; }
          var r = res.data;
          /* keep the newest 10 */
          self.client.from("saved_searches").select("id").eq("user_id", u.id).order("created_at", { ascending: false }).range(10, 49).then(function (old) {
            if (!old.error && old.data && old.data.length) {
              self.client.from("saved_searches").delete().in("id", old.data.map(function (x) { return x.id; }));
            }
          });
          return { id: r.id, query: r.query || "", category: r.category || "", createdAt: Date.parse(r.created_at) };
        });
      });
    },
    deleteSavedSearch: function (id) {
      var self = this;
      if (self.mode !== "supabase" || !self.client) { return Promise.resolve({ ok: true }); }
      return self._sbUser().then(function (u) {
        if (!u) { return { ok: true }; }
        return self.client.from("saved_searches").delete().eq("id", id).eq("user_id", u.id).then(function (res) {
          if (res.error) { throw res.error; }
          return { ok: true };
        });
      });
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

  /* ----- account gate: suspended / banned full-screen notice + appeal -----
     Checks the signed-in user's profiles.account_status at boot, on auth
     changes, every 30s and when the app returns to the foreground (same
     cadence as the device-ban check). Suspended users get an appeal form;
     their appeal lands in the admin Appeals queue. */
  (function () {
    var GATE_ID = "nm-account-gate";
    function removeGate() { var el = document.getElementById(GATE_ID); if (el) { el.remove(); } }
    function esc(s) { return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    function renderAppealForm() {
      DB.myOpenAppeal().then(function (open) {
        var box = document.getElementById("nm-gate-appeal");
        if (!box) { return; }
        if (open) {
          box.innerHTML = '<p style="background:#eef7ee;color:#235723;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.5;">Your appeal has been submitted and is under review. The admin team will check it and decide.</p>';
          return;
        }
        box.innerHTML = '<p style="color:#555;font-size:13px;margin:12px 0 6px;">Think this is a mistake? Write your appeal below and the admin will review it.</p>' +
          '<textarea id="nm-gate-text" rows="4" maxlength="2000" placeholder="Explain what happened..." style="width:100%;box-sizing:border-box;border:1px solid #ccc;border-radius:10px;padding:10px;font-size:14px;font-family:inherit;"></textarea>' +
          '<div id="nm-gate-err" style="color:#b3261e;font-size:13px;min-height:16px;margin-top:4px;"></div>' +
          '<button id="nm-gate-send" style="background:#1cab55;color:#fff;border:0;border-radius:10px;padding:11px 22px;font-size:14px;cursor:pointer;">Submit appeal</button>';
        document.getElementById("nm-gate-send").onclick = function () {
          var msg = document.getElementById("nm-gate-text").value.trim();
          var err = document.getElementById("nm-gate-err");
          if (msg.length < 10) { err.textContent = "Please write a few words so the admin can review your case."; return; }
          var btn = document.getElementById("nm-gate-send");
          btn.disabled = true; btn.textContent = "Sending...";
          DB.submitAppeal(msg).then(function () { renderAppealForm(); }, function () {
            btn.disabled = false; btn.textContent = "Submit appeal";
            err.textContent = "Could not submit. Check your connection and try again.";
          });
        };
      });
    }
    function showGate(st) {
      if (document.getElementById(GATE_ID)) { return; }
      var banned = st.status === "banned";
      var el = document.createElement("div");
      el.id = GATE_ID;
      el.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(15,17,21,.96);display:flex;align-items:center;justify-content:center;padding:20px;";
      el.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;padding:28px 24px;text-align:center;">' +
        '<div style="font-size:40px;">' + (banned ? "⛔" : "⏸️") + '</div>' +
        '<h2 style="margin:10px 0 6px;font-size:20px;">' + (banned ? "Account banned" : "Account suspended") + '</h2>' +
        '<p style="color:#555;font-size:14px;line-height:1.5;margin:0 0 6px;">' + (banned
          ? "This account has been permanently banned for violating marketplace policy."
          : "Your account was suspended by our safety system. You cannot buy, sell or chat while suspended.") + '</p>' +
        (st.reason ? '<p style="background:#fdf2f2;color:#8a2b2b;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.5;">' + esc(st.reason) + '</p>' : "") +
        (banned ? "" : '<div id="nm-gate-appeal"></div>') +
        '<button id="nm-gate-logout" style="margin-top:16px;background:#111;color:#fff;border:0;border-radius:10px;padding:11px 22px;font-size:14px;cursor:pointer;">Log out</button>' +
      '</div>';
      document.body.appendChild(el);
      document.getElementById("nm-gate-logout").onclick = function () {
        DB.signOut().then(function () { location.reload(); }, function () { location.reload(); });
      };
      if (!banned) { renderAppealForm(); }
    }
    function checkGate() {
      if (!DB || DB.mode !== "supabase" || !DB.client) { return; }
      rtSync();
      if (DB.trackPresence) { try { DB.trackPresence(); } catch (e) {} }
      DB.myAccountStatus().then(function (st) {
        if (!st) { removeGate(); return; }
        if (st.status === "suspended" || st.status === "banned") { showGate(st); } else { removeGate(); }
      });
    }
    /* ----- Supabase Realtime: instant reflection of posts, texts, edits, deletes -----
       One channel per signed-in user. postgres_changes respects RLS, so users only
       ever receive events for rows they are allowed to see. Listeners register via
       DB.onLive(kind, cb) with kind in products|messages|conversations|offers|profiles. */
    var rtListeners = { products: [], messages: [], conversations: [], offers: [], profiles: [], statuses: [], follows: [], notifications: [] };
    var rtChannel = null, rtUid = null, rtTimers = {};
    function rtEmit(kind, row) { rtListeners[kind].slice().forEach(function (cb) { try { cb(row); } catch (e) {} }); }
    function rtFire(kind, row) {
      var wait = kind === "messages" ? 200 : 700;
      clearTimeout(rtTimers[kind]);
      var last = row;
      rtTimers[kind] = setTimeout(function () { rtEmit(kind, last); }, wait);
    }
    function rtSync() {
      if (!DB || DB.mode !== "supabase" || !DB.client) { return; }
      DB._sbUser().then(function (u) {
        if (!u) {
          if (rtChannel) { try { DB.client.removeChannel(rtChannel); } catch (e) {} rtChannel = null; rtUid = null; }
          return;
        }
        if (rtChannel && rtUid === u.id) { return; }
        if (rtChannel) { try { DB.client.removeChannel(rtChannel); } catch (e) {} rtChannel = null; }
        rtUid = u.id;
        try {
          rtChannel = DB.client.channel("nm-live-" + u.id)
            .on("postgres_changes", { event: "*", schema: "public", table: "products" }, function (p) { rtFire("products", p.new || p.old); })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, function (p) { rtFire("messages", p.new); })
            .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, function (p) { rtFire("conversations", p.new || p.old); })
            .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, function (p) { rtFire("offers", p.new || p.old); })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: "id=eq." + u.id }, function (p) { checkGate(); rtFire("profiles", p.new); })
            .on("postgres_changes", { event: "*", schema: "public", table: "statuses" }, function (p) { rtFire("statuses", p.new || p.old); })
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, function (p) { rtFire("notifications", p.new); })
            .subscribe();
        } catch (e) { rtChannel = null; }
      }).catch(function () {});
    }
    DB.onLive = function (kind, cb) { if (rtListeners[kind] && typeof cb === "function") { rtListeners[kind].push(cb); } };
    DB._rtFire = rtFire;

    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", checkGate); } else { checkGate(); }
    setInterval(checkGate, 30000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { checkGate(); } });
    try { if (DB.client && DB.client.auth && DB.client.auth.onAuthStateChange) { DB.client.auth.onAuthStateChange(function () { setTimeout(checkGate, 500); }); } } catch (e) {}
  })();

  /* ----- Realtime Presence: real online status + last seen (2026-10-16) -----
     Shared channel "nm-presence" keyed by user id. track() runs only while the
     app is foregrounded; untrack + heartbeat on hidden/beforeunload. UI reads
     DB.presenceOnline(uid) for the live dot, DB.presenceBadge(uid, elId) to
     paint an element ("Online" or "Last seen X" - never fabricated: if no
     presence and no last_seen_at, the element is hidden). */
  (function () {
    var prChannel = null, prUid = null, prState = {}, prCbs = [], prEls = {};
    var hbTimer = null;

    function prOnline(uid) {
      if (!uid) { return false; }
      var arr = prState[uid];
      return !!(arr && arr.length);
    }
    function prRepaint() {
      try { prState = prChannel ? prChannel.presenceState() : {}; } catch (e) { prState = {}; }
      Object.keys(prEls).forEach(function (elId) {
        var uid = prEls[elId];
        if (elId === "thread-sub" && window.NM_threadPeer !== uid) { return; }
        var el = document.getElementById(elId);
        if (!el) { delete prEls[elId]; return; }
        prPaint(uid, el);
      });
      prCbs.slice().forEach(function (cb) { try { cb(prState); } catch (e) {} });
    }
    function prPaint(uid, el) {
      if (prOnline(uid)) {
        el.innerHTML = '<span class="presence-dot on"></span><span class="presence-txt">Online</span>';
        el.hidden = false;
        return;
      }
      DB.getPresenceInfo(uid).then(function (info) {
        var e2 = document.getElementById(el.id);
        if (!e2) { return; }
        if (info && info.last_seen_at) {
          e2.innerHTML = '<span class="presence-dot"></span><span class="presence-txt">Last seen ' + DB.relTime(info.last_seen_at) + '</span>';
          e2.hidden = false;
        } else {
          e2.innerHTML = "";
          e2.hidden = true;
        }
      });
    }
    function prTrack() {
      try { if (prChannel && prUid && !document.hidden) { prChannel.track({ online: true, at: Date.now() }); } } catch (e) {}
    }
    function prUntrack() {
      try { if (prChannel) { prChannel.untrack(); } } catch (e) {}
    }
    function prHeartbeat() {
      if (!prUid || !DB.client) { return; }
      var uid = prUid;
      try {
        DB.client.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", uid)
          .then(function () {}, function () {});
      } catch (e) {}
    }
    function prStartHb() {
      prStopHb();
      hbTimer = setInterval(function () { if (!document.hidden) { prHeartbeat(); } }, 60000);
    }
    function prStopHb() { if (hbTimer) { clearInterval(hbTimer); hbTimer = null; } }
    function prBoot() {
      if (!DB || DB.mode !== "supabase" || !DB.client) { return; }
      DB._sbUser().then(function (u) {
        var uid = u && u.id;
        if (!uid) {
          if (prChannel) { try { DB.client.removeChannel(prChannel); } catch (e) {} prChannel = null; prUid = null; }
          prStopHb();
          return;
        }
        if (prChannel && prUid === uid) { prTrack(); return; }
        if (prChannel) { try { DB.client.removeChannel(prChannel); } catch (e) {} prChannel = null; }
        prUid = uid;
        try {
          prChannel = DB.client.channel("nm-presence", { config: { presence: { key: uid } } });
          prChannel.on("presence", { event: "sync" }, prRepaint)
            .on("presence", { event: "join" }, prRepaint)
            .on("presence", { event: "leave" }, prRepaint)
            .subscribe(function (status) { if (status === "SUBSCRIBED") { prTrack(); prRepaint(); } });
        } catch (e) { prChannel = null; }
        prStartHb();
      }).catch(function () {});
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { prUntrack(); prHeartbeat(); } else { prTrack(); prHeartbeat(); }
    });
    window.addEventListener("beforeunload", function () { prHeartbeat(); });
    DB.onPresence = function (cb) { if (typeof cb === "function") { prCbs.push(cb); try { cb(prState); } catch (e) {} } };
    DB.presenceOnline = function (uid) { return prOnline(uid); };
    DB.presenceBadge = function (uid, elId) {
      if (!uid || !elId) { return; }
      prEls[elId] = uid;
      var el = document.getElementById(elId);
      if (el) { prPaint(uid, el); }
    };
    DB.trackPresence = prBoot;
    DB.getPresenceInfo = function (uid) {
      if (!uid || !DB.client) { return Promise.resolve(null); }
      return DB.client.from("profiles").select("id,last_seen_at").eq("id", uid).maybeSingle()
        .then(function (res) {
          if (!res || res.error) { return null; }
          return res.data || null;
        }, function () { return null; });
    };
    DB.relTime = function (ts) {
      try {
        var ms = Date.now() - Date.parse(ts);
        if (isNaN(ms) || ms < 0) { return ""; }
        var m = Math.floor(ms / 60000);
        if (m < 1) { return "just now"; }
        if (m < 60) { return m + "m ago"; }
        var h = Math.floor(m / 60);
        if (h < 24) { return h + "h ago"; }
        var d = Math.floor(h / 24);
        if (d === 1) { return "yesterday"; }
        if (d < 7) { return d + "d ago"; }
        return new Date(ts).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
      } catch (e) { return ""; }
    };
    DB.replySpeedLabel = function (st) {
      if (!st || !st.replies || st.replies < 3) { return null; }
      var h = (st.medMs || st.avgMs || 0) / 3600000;
      if (h <= 1) { return "Usually replies within an hour"; }
      if (h <= 4) { return "Usually replies within a few hours"; }
      if (h <= 24) { return "Usually replies within a day"; }
      var d = Math.round(h / 24);
      return "Usually replies within ~" + d + " day" + (d > 1 ? "s" : "");
    };
  })();

  /* ----- Offline banner: slim sticky strip, theme-safe, never permanent ----- */
  (function () {
    function bar() { return document.getElementById("nm-offline"); }
    function show(msg, back) {
      var b = bar();
      if (!b) { return; }
      b.hidden = false;
      b.textContent = msg;
      b.classList.toggle("back", !!back);
      if (back) { setTimeout(function () { var b2 = bar(); if (b2) { b2.hidden = true; b2.classList.remove("back"); } }, 2600); }
    }
    function hide() { var b = bar(); if (b) { b.hidden = true; b.classList.remove("back"); } }
    function sync() {
      if (navigator.onLine === false) { show("You are offline \u2014 some things may not load. Check your connection.", false); }
      else { hide(); }
    }
    window.addEventListener("offline", sync);
    window.addEventListener("online", function () { show("Back online.", true); setTimeout(sync, 2700); });
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", sync); } else { sync(); }
  })();

    /* ----- In-app notifications: new messages + new offers (2026-10-16) -----
       Toast that taps through. No web-push (service worker) - noted as next step. */
    DB.notify = function (t, b, fn) {
      try {
        var d = document.getElementById("nm-note");
        if (d) { d.remove(); }
        d = document.createElement("div");
        d.id = "nm-note";
        d.setAttribute("role", "alert");
        var h = document.createElement("b"); h.textContent = t;
        var sp = document.createElement("span"); sp.textContent = b;
        d.appendChild(h); d.appendChild(sp);
        d.onclick = function () { try { fn && fn(); } catch (e) {} try { d.remove(); } catch (e2) {} };
        document.body.appendChild(d);
        setTimeout(function () { var x = document.getElementById("nm-note"); if (x) { x.remove(); } }, 6000);
      } catch (e) {}
    };
    DB.notifyMsg = function (r) {
      try {
        if (document.hidden || !r || !r.conversation_id) { return; }
        var me = null;
        try { var u = JSON.parse(localStorage.getItem("nc2_cached_user") || "null"); me = u && (u.id || u.user_id); } catch (e) {}
        if (r.sender_id && me && String(r.sender_id) === String(me)) { return; }
        var cs = [];
        try { cs = JSON.parse(localStorage.getItem("nm_convos") || "[]"); } catch (e2) {}
        var o = null;
        for (var k = 0; k < cs.length; k++) { if (cs[k].id === r.conversation_id) { o = cs[k]; break; } }
        if (!o) { return; }
        var nm = o.otherName || o.sellerName || o.buyerName || "Someone";
        var bd = String(r.body || "").replace(/^\[(img|AVAILABILITY PING)\]\s*/, "").slice(0, 60) || "sent you a message";
        DB.notify("New message", nm + ": " + bd, function () {
          if (window.NM_openThread) { try { window.NM_openThread(r.conversation_id); } catch (e3) {} }
        });
      } catch (e4) {}
    };
    DB.notifyOffer = function (r) {
      try {
        if (document.hidden || !r || !r.id) { return; }
        var seen = {};
        try { seen = JSON.parse(localStorage.getItem("nm_seen_offers") || "{}"); } catch (e) {}
        if (seen[r.id]) { return; }
        seen[r.id] = 1;
        try { localStorage.setItem("nm_seen_offers", JSON.stringify(seen)); } catch (e2) {}
        DB.notify("New offer", "Someone made an offer on your listing. Tap to view.", function () {
          var b = document.querySelector('#bottomnav .nav-btn[data-go="me"]');
          if (b) { b.click(); }
        });
      } catch (e3) {}
    };

  
/* ----- Follows (real counts, follows table) ----- */
DB._followingCache = null;
DB._needLogin = function () {
  var self = this;
  if (self.mode !== "supabase" || !self.client) { return Promise.reject(new Error("Connect to the internet to follow sellers.")); }
  return self._sbUser().then(function (u) { if (!u) { throw new Error("Log in to follow sellers."); } return u; });
};
DB.followingIds = function (force) {
  var self = this;
  if (self._followingCache && !force) { return Promise.resolve(self._followingCache.slice()); }
  return self._needLogin().then(function (u) {
    return self.client.from("follows").select("seller_id").eq("follower_id", u.id);
  }).then(function (res) {
    if (res.error) { throw res.error; }
    self._followingCache = (res.data || []).map(function (r) { return r.seller_id; });
    return self._followingCache.slice();
  }).catch(function () { return self._followingCache ? self._followingCache.slice() : []; });
};
DB.isFollowing = function (sellerId) {
  return this.followingIds().then(function (ids) { return ids.indexOf(sellerId) >= 0; });
};
DB.followSeller = function (sellerId) {
  var self = this;
  return self._needLogin().then(function (u) {
    if (String(u.id) === String(sellerId)) { throw new Error("You cannot follow yourself."); }
    return self.client.from("follows").upsert({ follower_id: u.id, seller_id: sellerId }, { onConflict: "follower_id,seller_id", ignoreDuplicates: true });
  }).then(function (res) {
    if (res.error) { throw res.error; }
    self._followingCache = self._followingCache || []; if (self._followingCache.indexOf(sellerId) < 0) { self._followingCache.push(sellerId); } self._rtFire("follows", { seller_id: sellerId });
    return { ok: true, following: true };
  });
};
DB.unfollowSeller = function (sellerId) {
  var self = this;
  return self._needLogin().then(function (u) {
    return self.client.from("follows").delete().eq("follower_id", u.id).eq("seller_id", sellerId);
  }).then(function (res) {
    if (res.error) { throw res.error; }
    self._followingCache = (self._followingCache || []).filter(function (id) { return String(id) !== String(sellerId); }); self._rtFire("follows", { seller_id: sellerId });
    return { ok: true, following: false };
  });
};

/* blocks */
DB._blockedCache = null;
DB.blockedIds = function (force) {
  var self = this;
  if (self._blockedCache && !force) { return Promise.resolve(self._blockedCache.slice()); }
  return self._needLogin().then(function (u) { return self.client.from("blocks").select("blocked_id").eq("blocker_id", u.id); })
    .then(function (res) {
      if (res.error) { throw res.error; }
      self._blockedCache = (res.data || []).map(function (r) { return String(r.blocked_id); });
      return self._blockedCache.slice();
    }).catch(function () { return (self._blockedCache || []).slice(); });
};
DB.isBlocked = function (peerId) { return this.blockedIds().then(function (ids) { return ids.indexOf(String(peerId)) >= 0; }); };
DB.blockUser = function (peerId) {
  var self = this;
  return self._needLogin().then(function (u) {
    if (String(u.id) === String(peerId)) { throw new Error("You cannot block yourself."); }
    return self.client.from("blocks").upsert({ blocker_id: u.id, blocked_id: peerId }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  }).then(function (res) {
    if (res.error) { throw res.error; }
    var c = self._blockedCache = self._blockedCache || [];
    if (c.indexOf(String(peerId)) < 0) { c.push(String(peerId)); }
    return { ok: true, blocked: true };
  });
};
DB.unblockUser = function (peerId) {
  var self = this;
  return self._needLogin().then(function (u) { return self.client.from("blocks").delete().eq("blocker_id", u.id).eq("blocked_id", peerId); })
    .then(function (res) {
      if (res.error) { throw res.error; }
      self._blockedCache = (self._blockedCache || []).filter(function (id) { return String(id) !== String(peerId); });
        return { ok: true, blocked: false };
    });
};
DB.followerCount = function (sellerId) {
  var self = this;
  if (self.mode !== "supabase" || !self.client) { return Promise.resolve(0); }
  return self.client.from("follows").select("follower_id", { count: "exact", head: true }).eq("seller_id", sellerId)
    .then(function (res) { return res.error ? 0 : (res.count || 0); }, function () { return 0; });
};
DB.followingProfiles = function () {
  var self = this;
  return self.followingIds().then(function (ids) {
    if (!ids.length) { return []; }
    return self.client.from("profiles").select("id,display_name,avatar_url,last_seen_at").in("id", ids)
      .then(function (res) { return res.error ? [] : (res.data || []); }, function () { return []; });
  });
};

/* ----- Statuses (WhatsApp-style, follower-only via RLS) ----- */
DB._statusCols = "id,user_id,kind,media_urls,caption,captions,created_at,expires_at,product_id,visibility";
DB.listStatuses = function (userIds) {
  var self = this;
  if (self.mode !== "supabase" || !self.client || !userIds || !userIds.length) { return Promise.resolve([]); }
  return self.client.from("statuses").select(self._statusCols)
    .in("user_id", userIds).gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false }).limit(100)
    .then(function (res) { return res.error ? [] : (res.data || []); }, function () { return []; });
};
DB.myStatuses = function () {
  var self = this;
  return self._needLogin().then(function (u) { return self.listStatuses([u.id]); });
};
DB.postStatus = function (files, caption, opts) {
  /* files: array of {file, kind} where kind = 'image'|'video'. */
  var self = this;
  return self._needLogin().then(function (u) {
    var imgs = files.filter(function (f) { return f.kind === "image"; });
    var vids = files.filter(function (f) { return f.kind === "video"; });
    if (!imgs.length && !vids.length) { throw new Error("Pick a photo or video first."); }
    if (imgs.length > 5) { throw new Error("Up to 5 pictures."); }
    if (vids.length > 1 || (vids.length === 1 && imgs.length)) { throw new Error("Post one video or up to 5 pictures."); }
    var kind = vids.length ? "video" : "image";
    var caps = Array.isArray(caption) ? caption : [caption];
    var list = vids.length ? vids : imgs;
    var urls = [], chain = Promise.resolve();
    list.forEach(function (f, i) {
      chain = chain.then(function () {
        var ext = (f.file.name || "").split(".").pop().toLowerCase();
        ext = ext && ext.length < 5 ? ext : (kind === "video" ? "mp4" : "jpg");
        var path = u.id + "/" + Date.now() + "-" + i + "." + ext;
        return self.client.storage.from("status-media").upload(path, f.file, { upsert: false }).then(function (res) {
          if (res.error) { throw res.error; }
          urls.push(self.client.storage.from("status-media").getPublicUrl(path).data.publicUrl);
        });
      });
    });
    return chain.then(function () {
      return self.client.from("statuses").insert({
        user_id: u.id, kind: kind, media_urls: urls, product_id: (opts && opts.product_id) || null, visibility: (opts && opts.visibility) || "followers", caption: String(caps[0] || "").slice(0, 300), captions: list.map(function (f, i) { return String(caps[i] || "").slice(0, 300); })
      }).select(self._statusCols).single();
    }).then(function (res) {
      if (res.error) { throw res.error; }
      self._rtFire("statuses", res.data);
      return res.data;
    });
  });
};
DB.deleteStatus = function (id) {
  var self = this;
  return self._needLogin().then(function (u) {
    return self.client.from("statuses").delete().eq("id", id).eq("user_id", u.id);
  }).then(function (res) {
    if (res.error) { throw res.error; }
    self._rtFire("statuses", { id: id, deleted: true });
    return { ok: true };
  });
};

window.NM_DB = DB;
  window.NM_aiScan = function (payload) { return DB.aiScan(payload); };

  /* ----- Premium upsell overlay + payment return handling ----- */
  (function () {
    function payToast(msg, ok) {
      var t = document.createElement("div");
      t.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom));z-index:99999;background:" + (ok ? "#1cab55" : "#333") + ";color:#fff;padding:12px 18px;border-radius:12px;font-size:14px;max-width:88vw;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25);";
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 4500);
    }
    window.NM_payToast = payToast;
    window.NM_showPremium = function (st) {
      if (document.getElementById("nm-premium")) { return; }
      var el = document.createElement("div");
      el.id = "nm-premium";
      el.style.cssText = "position:fixed;inset:0;z-index:99998;background:rgba(15,17,21,.7);display:flex;align-items:flex-end;justify-content:center;";
      el.innerHTML = '<div style="background:var(--card,#fff);color:var(--card-ink,#141414);border-radius:20px 20px 0 0;max-width:480px;width:100%;padding:26px 22px calc(22px + env(safe-area-inset-bottom));text-align:center;">' +
        '<div style="font-size:34px;">\uD83D\uDC51</div>' +
        '<h2 style="margin:8px 0 6px;font-size:20px;">You have used your 3 free listings</h2>' +
        '<p style="color:var(--card-mut,#666);font-size:14px;line-height:1.55;margin:0 0 16px;">Launch promo: pay \u20A61,000 once for 2 full months of Premium, unlimited listings, the gold badge, and a free advertising boost for your current listings.</p>' +
        '<button data-plan="premium_promo_2m" style="display:block;width:100%;background:#e8380d;color:#fff;border:0;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Launch promo \u2014 \u20A61,000 for 2 months + free ad boost</button>' +
        '<button data-plan="premium_6m" style="display:block;width:100%;background:#1cab55;color:#fff;border:0;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:10px;">Premium \u2014 \u20A65,000 for 6 months</button>' +
        '<button id="nm-premium-close" style="background:none;border:0;color:var(--card-mut,#666);font-size:14px;cursor:pointer;padding:8px;">Not now</button>' +
        '<div id="nm-premium-err" style="color:#b3261e;font-size:13px;min-height:16px;"></div></div>';
      document.body.appendChild(el);
      el.querySelector("#nm-premium-close").onclick = function () { el.remove(); };
      el.addEventListener("click", function (e) { if (e.target === el) { el.remove(); } });
      Array.prototype.forEach.call(el.querySelectorAll("[data-plan]"), function (b) {
        b.onclick = function () {
          b.disabled = true; b.textContent = "Opening payment...";
          DB.startPayment(b.getAttribute("data-plan")).catch(function (err) {
            b.disabled = false; b.textContent = "Try again";
            var e2 = document.getElementById("nm-premium-err"); if (e2) { e2.textContent = err.message || "Payment could not start."; }
          });
        };
      });
    };
    function handleReturn() {
      var q;
      try { q = new URLSearchParams(location.search); } catch (e) { return; }
      if (q.get("pay") !== "return") { return; }
      var ref = q.get("reference") || q.get("trxref");
      try { history.replaceState(null, "", location.pathname); } catch (e) {}
      if (!ref || !DB || DB.mode !== "supabase") { return; }
      var tries = 0;
      (function attempt() {
        DB.verifyPayment(ref).then(function (j) {
          if (j && j.ok && j.status === "paid") {
            if (j.purpose === "premium") { payToast((j.plan === "premium_promo_2m" || j.plan === "premium_1m") ? "Promo Premium active for 2 months. Your current listings got a free ad boost. Thank you!" : "Premium active. You can now post unlimited listings. Thank you!", 1); }
            else if (j.purpose === "bump") { payToast("Payment confirmed. Your listing has been promoted to the top.", 1); }
            else if (j.purpose === "featured") { payToast("Payment confirmed. Your listing is now featured for 2 weeks.", 1); }
            else if (j.purpose === "banner") { payToast("Payment confirmed. Your banner will be placed within one working day.", 1); }
            else { payToast("Payment confirmed. Thank you!", 1); }
          } else if (j && j.ok) { payToast("Payment was not completed. No charge was confirmed.", 0); }
          else if (++tries < 3) { setTimeout(attempt, 1500); }
          else { payToast("We could not verify that payment yet. If you paid, it will reflect shortly.", 0); }
        }, function () { if (++tries < 3) { setTimeout(attempt, 1500); } });
      })();
    }
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", handleReturn); } else { handleReturn(); }
  })();
})();
