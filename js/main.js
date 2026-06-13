  //  MORGAN WALLEN – main.js  (pure vanilla JS, no jQuery needed)
  
document.addEventListener("DOMContentLoaded", function () {
  var trigger = document.getElementById("nav-trigger");
  var mobileNav = document.getElementById("mobile-nav");
  var navMob = document.getElementById("nav-mob");
  var isOpen = false;

  var overlay = document.getElementById("mobile-nav-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "mobile-nav-overlay";
    document.body.appendChild(overlay);
  }

  if (trigger && mobileNav) {
    trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      isOpen ? closeMenu() : openMenu();
    });

    overlay.addEventListener("click", function () {
      closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900 && isOpen) closeMenu();
    });


    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) closeMenu();
    });

    if (navMob) {
      navMob.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function (e) {
          var href = link.getAttribute("href");
          if (href && !href.startsWith("#")) {
            e.preventDefault();
            closeMenu();
            setTimeout(function () {
              window.location.href = href;
            }, 340); 
          } else {
            closeMenu();
          }
        });
      });
    }
  }

  function openMenu() {
    isOpen = true;
    trigger.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
    mobileNav.classList.add("is-open");
    mobileNav.setAttribute("aria-hidden", "false");
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    isOpen = false;
    trigger.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
    mobileNav.setAttribute("aria-hidden", "true");
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  var header = document.querySelector("header");
  if (header) {
    window.addEventListener("scroll", function () {
      header.style.boxShadow =
        window.scrollY > 10 ? "0 2px 12px rgba(68,67,52,0.25)" : "none";
    });
  }

  var path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav#main a, #mobile-nav a").forEach(function (a) {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop - 130, behavior: "smooth" });
        if (isOpen) closeMenu();
      }
    });
  });

  document.addEventListener("click", function (e) {
    var thumb = e.target.closest(".epyt-gallery-thumb");
    if (!thumb) return;
    var videoId = thumb.dataset.videoid;
    if (!videoId) return;
    var iframe = document.getElementById("_ytid_65569");
    if (iframe) {
      iframe.src =
        "https://www.youtube.com/embed/" +
        videoId +
        "?enablejsapi=1&autoplay=1&rel=0&fs=1&controls=1";
    }
    var videos = document.getElementById("videos");
    if (videos) {
      window.scrollTo({ top: videos.offsetTop - 130, behavior: "smooth" });
    }
    document.querySelectorAll(".epyt-gallery-thumb").forEach(function (t) {
      t.classList.remove("active");
    });
    thumb.classList.add("active");
  });
});
