/* ============================================================
   supabase-auth.js  —  Morgan Wallen
   Handles: sign-in, sign-up, session state on signup.html
   ============================================================ */

(function () {
  "use strict";

  // var SUPABASE_URL = "https://gzzqpiwufbvoygqfxbrf.supabase.co";
  var SUPABASE_URL = "https://fubydicgzvpirtnzmerx.supabase.co";
  // var SUPABASE_ANON =
  //   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6enFwaXd1ZmJ2b3lncWZ4YnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjA2MTcsImV4cCI6MjA4ODYzNjYxN30.OUY4ktBGKSvnO56fpLfkP13da5T_fOLBEDX7aBW7PU4";
  var SUPABASE_ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1YnlkaWNnenZwaXJ0bnptZXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MDc1ODcsImV4cCI6MjA5NzI4MzU4N30.kUPjMDrYp9qARnHstlndhX1MJfsOa5rWiUCx05haRsE";

  var db = null; // set once CDN is confirmed ready

  /* ── Wait for Supabase CDN global to exist, then boot ── */
  function waitForSupabase(callback) {
    if (typeof supabase !== "undefined" && supabase.createClient) {
      callback();
    } else {
      setTimeout(function () {
        waitForSupabase(callback);
      }, 30);
    }
  }

  /* ── Small helpers ── */
  function el(id) {
    return document.getElementById(id);
  }

  function setMsg(id, text, isError) {
    var m = el(id);
    if (!m) return;
    m.textContent = text;
    m.className = "auth-msg" + (isError ? " error" : " success");
  }

  function setLoading(btnId, loading, defaultText) {
    var btn = el(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "Please wait…" : defaultText;
  }

  /* ── Tab switching (exposed immediately — doesn't need db) ── */
  window.switchTab = function (tabName) {
    ["signin", "signup"].forEach(function (t) {
      var tab = el("tab-" + t);
      var panel = el("panel-" + t);
      if (!tab || !panel) return;
      var active = t === tabName;
      tab.classList.toggle("active", active);
      panel.classList.toggle("active", active);
    });
    setMsg("signin-msg", "");
    setMsg("signup-msg", "");
  };

  /* ── Sign In ── */
  window.doSignIn = async function () {
    if (!db) {
      setMsg(
        "signin-msg",
        "Still connecting — please try again in a moment.",
        true,
      );
      return;
    }

    var email = el("si-email") ? el("si-email").value.trim() : "";
    var pass = el("si-pass") ? el("si-pass").value : "";

    if (!email || !pass) {
      setMsg("signin-msg", "Please enter your email and password.", true);
      return;
    }

    setLoading("signin-btn", true, "Sign In");
    setMsg("signin-msg", "");

    try {
      var res = await db.auth.signInWithPassword({
        email: email,
        password: pass,
      });

      if (res.error) {
        setMsg("signin-msg", res.error.message || "Sign in failed.", true);
        setLoading("signin-btn", false, "Sign In");
        return;
      }

      var userId = res.data.session.user.id;
      var profRes = await db
        .from("profiles")
        .select("is_admin, is_banned")
        .eq("id", userId)
        .single();
      var profile = (profRes && profRes.data) || {};

      if (profile.is_banned) {
        await db.auth.signOut();
        setMsg(
          "signin-msg",
          "This account has been suspended. Please contact support.",
          true,
        );
        setLoading("signin-btn", false, "Sign In");
        return;
      }

      sessionStorage.setItem("just_logged_in", "1");
      window.location.href = profile.is_admin ? "admin.html" : "dashboard.html";
    } catch (e) {
      setMsg(
        "signin-msg",
        e.message || "An error occurred. Please try again.",
        true,
      );
      setLoading("signin-btn", false, "Sign In");
    }
  };

  /* ── Sign Up ── */
  window.doSignUp = async function () {
    if (!db) {
      setMsg(
        "signup-msg",
        "Still connecting — please try again in a moment.",
        true,
      );
      return;
    }

    var firstName = el("fname") ? el("fname").value.trim() : "";
    var lastName = el("lname") ? el("lname").value.trim() : "";
    var email = el("su-email") ? el("su-email").value.trim() : "";
    var zip = el("zip") ? el("zip").value.trim() : "";
    var pass = el("su-pass") ? el("su-pass").value : "";

    if (!firstName || !email || !pass) {
      setMsg(
        "signup-msg",
        "First name, email and password are required.",
        true,
      );
      return;
    }
    if (pass.length < 6) {
      setMsg("signup-msg", "Password must be at least 6 characters.", true);
      return;
    }

    setLoading("signup-btn", true, "Create Account");
    setMsg("signup-msg", "");

    try {
      /* Check if registrations are open */
      var settingsRes = await db
        .from("site_settings")
        .select("value")
        .eq("key", "allow_registrations")
        .single();
      if (settingsRes.data && settingsRes.data.value === "false") {
        setMsg(
          "signup-msg",
          "New registrations are currently closed. Please check back later.",
          true,
        );
        setLoading("signup-btn", false, "Create Account");
        return;
      }

      /* Build the redirect URL — works on any host (localhost or live) */
      var siteBase =
        window.location.origin +
        window.location.pathname.replace(/\/[^/]*$/, "/");
      var redirectTo = siteBase + "signup.html?verified=1";

      var res = await db.auth.signUp({
        email: email,
        password: pass,
        options: {
          data: { first_name: firstName, last_name: lastName },
          emailRedirectTo: redirectTo,
        },
      });

      if (res.error) {
        setMsg("signup-msg", res.error.message || "Sign up failed.", true);
        setLoading("signup-btn", false, "Create Account");
        return;
      }

      /* Upsert profile row (DB trigger does this too, belt-and-suspenders) */
      if (res.data && res.data.user) {
        await db.from("profiles").upsert(
          {
            id: res.data.user.id,
            email: email,
            first_name: firstName,
            last_name: lastName,
            zip: zip,
          },
          { onConflict: "id" },
        );
      }

      /* If email confirm is disabled, session comes back immediately */
      if (res.data && res.data.session) {
        sessionStorage.setItem("just_logged_in", "1");
        window.location.href = "dashboard.html";
        return;
      }

      /* Email confirm required */
      setMsg(
        "signup-msg",
        "Account created! Check your email to confirm, then sign in.",
        false,
      );
      setLoading("signup-btn", false, "Create Account");
    } catch (e) {
      setMsg(
        "signup-msg",
        e.message || "An error occurred. Please try again.",
        true,
      );
      setLoading("signup-btn", false, "Create Account");
    }
  };

  /* ── Sign Out ── */
  window.doSignOut = async function () {
    if (db) await db.auth.signOut().catch(function () {});
    window.location.reload();
  };

  /* ── Handle email verification redirect ──
     Supabase appends #access_token=...&type=signup to the redirectTo URL.
     We also accept ?verified=1 as a fallback signal.
     Either way: sign the user out (don't auto-login), show success, open Sign In tab.
  */
  function handleVerificationRedirect() {
    var hash = window.location.hash || "";
    var params = new URLSearchParams(window.location.search);
    var isVerified =
      params.get("verified") === "1" ||
      (hash.includes("access_token") && hash.includes("type=signup"));
    if (!isVerified) return false;

    /* Strip the hash/query so a refresh doesn't re-trigger */
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    /* Sign out any auto-session Supabase may have created from the token */
    db.auth.signOut().catch(function () {});

    /* Show auth forms, switch to Sign In tab, display success banner */
    showAuthForms();
    switchTab("signin");

    var msg = el("signin-msg");
    if (msg) {
      msg.textContent = "✓ Email verified! You can now sign in below.";
      msg.className = "auth-msg success";
    }
    return true;
  }

  /* ── Page init: check existing session ── */
  async function init() {
    /* Handle email verification redirect FIRST */
    if (handleVerificationRedirect()) return;

    try {
      var res = await db.auth.getSession();
      if (!res.data || !res.data.session) {
        showAuthForms();
        return;
      }

      var user = res.data.session.user;
      var profRes = await db
        .from("profiles")
        .select("is_admin, is_banned, email, first_name, last_name")
        .eq("id", user.id)
        .single();
      var profile = (profRes && profRes.data) || {};

      if (profile.is_banned) {
        await db.auth.signOut();
        showAuthForms();
        return;
      }

      if (profile.is_admin) {
        window.location.href = "admin.html";
        return;
      }

      showSignedInState(profile, user);
    } catch (e) {
      console.warn("supabase-auth init error:", e.message);
      showAuthForms();
    }
  }

  function showAuthForms() {
    var forms = el("auth-forms");
    var so = el("signout-section");
    if (forms) forms.style.display = "";
    if (so) so.style.display = "none";
  }

  function showSignedInState(profile, user) {
    var forms = el("auth-forms");
    var so = el("signout-section");
    var ue = el("user-email");
    if (forms) forms.style.display = "none";
    if (so) so.style.display = "";
    if (ue) {
      var name =
        ((profile.first_name || "") + " " + (profile.last_name || "")).trim() ||
        profile.email ||
        user.email ||
        "";
      ue.textContent = name;
    }
    var signoutBtn = el("signout-btn");
    if (signoutBtn) signoutBtn.addEventListener("click", window.doSignOut);
  }

  /* ── Boot: wait for CDN, then create client, then init page ── */
  function boot() {
    db =
      window.supabaseClient ||
      supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });
    window.supabaseClient = db;

    /* Run page session check after DOM is ready */
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  /* Enter key shortcuts — safe to wire up immediately */
  document.addEventListener("DOMContentLoaded", function () {
    var siPass = el("si-pass");
    if (siPass)
      siPass.addEventListener("keydown", function (e) {
        if (e.key === "Enter") window.doSignIn();
      });
    var suPass = el("su-pass");
    if (suPass)
      suPass.addEventListener("keydown", function (e) {
        if (e.key === "Enter") window.doSignUp();
      });
  });

  waitForSupabase(boot);
})();
