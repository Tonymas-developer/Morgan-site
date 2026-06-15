/* ============================================================
   nav-auth.js  —  Morgan Wallen
   Handles: nav user widget + profile dialog on ALL pages
   Requires: Supabase JS v2 CDN loaded before this file
   ============================================================ */

(function () {
  "use strict";

  /* Wait for the Supabase CDN global to be available */
  if (typeof supabase === "undefined") {
    console.warn("nav-auth.js: Supabase CDN not loaded yet — retrying…");
    setTimeout(function () {
      var s = document.createElement("script");
      s.src = "/js/nav-auth.js";
      document.body.appendChild(s);
    }, 200);
    return;
  }

  // var SUPABASE_URL = "https://gzzqpiwufbvoygqfxbrf.supabase.co";
  var SUPABASE_URL = "https://lfnshkrvyoiikvxjmowy.supabase.co";
  // var SUPABASE_ANON =
  //   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6enFwaXd1ZmJ2b3lncWZ4YnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjA2MTcsImV4cCI6MjA4ODYzNjYxN30.OUY4ktBGKSvnO56fpLfkP13da5T_fOLBEDX7aBW7PU4";
  var SUPABASE_ANON =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmbnNoa3J2eW9paWt2eGptb3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTYxNzIsImV4cCI6MjA5NzEzMjE3Mn0.fr14v46Uby7ne-a1nZcOOifL4WlfO5TAgfHe0F4tsfw";

  /* Re-use existing client if another script already created one */
  var db =
    window.supabaseClient ||
    supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  window.supabaseClient = db;

  /* ── Helpers ── */
  function el(id) {
    return document.getElementById(id);
  }

  function getInitials(firstName, lastName, email) {
    if (firstName && lastName)
      return (firstName[0] + lastName[0]).toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    return email ? email[0].toUpperCase() : "?";
  }

  function revealAuthSlots() {
    var navItem = el("nav-auth-item");
    var mobItem = el("mob-auth-item");
    if (navItem) navItem.classList.add("auth-ready");
    if (mobItem) mobItem.classList.add("auth-ready");
  }

  /* ── Build the nav user widget (replaces Login link) ── */
  function buildNavWidget(user, profile) {
    var firstName =
      (profile && profile.first_name) ||
      (user.user_metadata && user.user_metadata.first_name) ||
      "";
    var lastName =
      (profile && profile.last_name) ||
      (user.user_metadata && user.user_metadata.last_name) ||
      "";
    var email = user.email || "";
    var displayName = firstName
      ? firstName + (lastName ? " " + lastName : "")
      : email;
    var initials = getInitials(firstName, lastName, email);

    /* ── Desktop nav widget ── */
    var navItem = el("nav-auth-item");
    if (navItem) {
      navItem.innerHTML = "";
      var widget = document.createElement("div");
      widget.className = "nav-user-widget";
      widget.id = "nav-user-widget";
      widget.setAttribute("onclick", "toggleUserDialog()");
      widget.setAttribute("title", "Account");
      widget.setAttribute("role", "button");
      widget.setAttribute("tabindex", "0");
      widget.innerHTML =
        '<div class="nav-user-avatar">' +
        initials +
        "</div>" +
        '<span class="nav-user-name">' +
        _esc(displayName) +
        "</span>" +
        '<svg class="nav-user-caret" width="10" height="10" viewBox="0 0 10 6" fill="none" aria-hidden="true">' +
        '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      navItem.appendChild(widget);
    }

    var mobItem = el("mob-auth-item");
    if (mobItem) {
      mobItem.innerHTML =
        '<div class="mob-user-row auth-ready" onclick="toggleUserDialog()" role="button" tabindex="0">' +
        '<div class="nav-user-avatar nav-user-avatar--sm">' +
        initials +
        "</div>" +
        "<span>" +
        _esc(displayName) +
        "</span>" +
        "</div>";
    }

    /* ── Populate dialog ── */
    var dName = el("udialog-name");
    var dEmail = el("udialog-email");
    if (dName) dName.textContent = displayName;
    if (dEmail) dEmail.textContent = email;
  }

  function _esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Dialog open / close ── */
  window.toggleUserDialog = function () {
    var dialog = el("user-dialog");
    var overlay = el("user-dialog-overlay");
    if (!dialog) return;
    var isOpen = dialog.style.display === "block";
    if (isOpen) {
      window.closeUserDialog();
    } else {
      dialog.style.display = "block";
      overlay.style.display = "block";
      dialog.style.opacity = "0";
      dialog.style.transform = "translateY(-8px)";
      requestAnimationFrame(function () {
        dialog.style.transition = "opacity 0.2s ease, transform 0.2s ease";
        dialog.style.opacity = "1";
        dialog.style.transform = "translateY(0)";
      });
    }
  };

  window.closeUserDialog = function () {
    var dialog = el("user-dialog");
    var overlay = el("user-dialog-overlay");
    if (dialog) {
      dialog.style.display = "none";
      dialog.style.transition = "";
    }
    if (overlay) overlay.style.display = "none";
  };

  /* Close on Escape */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") window.closeUserDialog();
  });

  /* ── Sign Out from dialog button ── */
  document.addEventListener("DOMContentLoaded", function () {
    var btn = el("udialog-signout-btn");
    if (btn) {
      btn.addEventListener("click", async function () {
        await db.auth.signOut().catch(function () {});
        window.location.href = "signup.html";
      });
    }
  });

  /* ── Init: check session and update nav ── */
  async function init() {
    try {
      var res = await db.auth.getSession();
      if (!res.data || !res.data.session) {
        /* Not logged in — keep "Sign In" / "Login" link, just reveal it */
        revealAuthSlots();
        return;
      }

      var user = res.data.session.user;

      /* Fetch profile for display name */
      var profile = null;
      try {
        var profileRes = await db
          .from("profiles")
          .select("first_name, last_name, email, is_admin")
          .eq("id", user.id)
          .single();
        if (profileRes.data) profile = profileRes.data;
      } catch (e) {
        /* fall back to user metadata */
      }

      buildNavWidget(user, profile);
      revealAuthSlots();
    } catch (e) {
      console.warn("nav-auth init failed:", e.message);
      /* FIX: even on error, reveal the slots so "Sign In" doesn't
         stay permanently hidden */
      revealAuthSlots();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
