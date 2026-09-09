/**
 * Application Core & Navigation Controller
 */
const App = {
  currentView: "auth", // "auth", "trips", or "timeline"
  activeTripId: null,
  currentUser: null,

  async init() {
    // Initialize submodules
    TripsView.init();
    MomentsView.init();
    CaptureModal.init();
    AuthModal.init();

    // Check user auth session
    await this.checkAuth();

    // Setup navigation / popstate
    this.setupRouting();
    this.setupHeader();
    this.setupPrivacyModal();
    this.setupShowcaseCarousel();

    // Register Service Worker for PWA
    this.registerServiceWorker();

    // Initial route handling
    this.handleRoute();
  },

  async checkAuth() {
    try {
      this.currentUser = await API.getMe();
      this.updateUserHeader();
    } catch (e) {
      this.currentUser = null;
      this.updateUserHeader();
    }
  },

  updateUserHeader() {
    const profileWrapper = document.getElementById("header-user-profile-wrapper");
    const authBtn = document.getElementById("btn-header-auth");
    const avatarEl = document.getElementById("header-user-avatar");
    const nameEl = document.getElementById("header-user-name");
    const popoverAvatar = document.getElementById("popover-user-avatar");
    const popoverName = document.getElementById("popover-user-name");
    const popoverEmail = document.getElementById("popover-user-email");
    const menu = document.getElementById("header-profile-menu");
    const profileBtn = document.getElementById("btn-header-profile");

    if (this.currentUser) {
      const name = this.currentUser.username || this.currentUser.email.split("@")[0];
      const initial = name.charAt(0).toUpperCase();

      if (avatarEl) avatarEl.textContent = initial;
      if (nameEl) nameEl.textContent = name;
      if (popoverAvatar) popoverAvatar.textContent = initial;
      if (popoverName) popoverName.textContent = name;
      if (popoverEmail) popoverEmail.textContent = this.currentUser.email;

      if (profileWrapper) profileWrapper.style.display = "inline-flex";
      if (authBtn) authBtn.style.display = "none";
    } else {
      if (profileWrapper) profileWrapper.style.display = "none";
      if (authBtn) authBtn.style.display = "inline-flex";
      if (menu) menu.style.display = "none";
      if (profileBtn) profileBtn.setAttribute("aria-expanded", "false");
    }

    if (window.AuthModal && typeof window.AuthModal.updateAuthPageState === "function") {
      window.AuthModal.updateAuthPageState();
    }
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  setupRouting() {
    window.addEventListener("hashchange", () => this.handleRoute());
  },

  handleRoute() {
    const hash = window.location.hash;

    if (hash.startsWith("#trip/")) {
      const tripId = parseInt(hash.replace("#trip/", ""), 10);
      if (tripId) {
        this.showTimelineView(tripId);
        return;
      }
    }

    if (hash === "#trips" || hash === "#collection") {
      this.showTripsView();
      return;
    }

    if (hash === "#auth" || hash === "#login" || hash === "#signin" || hash === "#home") {
      this.showAuthView();
      return;
    }

    if (hash === "#privacy" || hash === "#privacy-policy") {
      if (this.currentUser) {
        this.showTripsView();
      } else {
        this.showAuthView();
      }
      this.openPrivacyModal?.();
      return;
    }

    // Default home page is the Sign In / Landing View
    this.showAuthView();
  },

  setupHeader() {
    // Back to trips from timeline
    const backTripsBtn = document.getElementById("btn-back-to-trips");
    backTripsBtn?.addEventListener("click", () => {
      this.navigateToTrips();
    });

    // Header brand title click (navigates to collection if logged in, or sign in home if guest)
    const brandTitle = document.getElementById("brand-header-title");
    brandTitle?.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.currentUser) {
        this.navigateToTrips();
      } else {
        this.navigateToAuth();
      }
    });

    // Back to Top buttons
    document.querySelectorAll(".footer-back-to-top, .btn-back-to-top-global, .cute-back-to-top, #btn-footer-back-to-top").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    // Profile menu toggle
    const profileBtn = document.getElementById("btn-header-profile");
    const profileMenu = document.getElementById("header-profile-menu");

    profileBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = profileMenu?.style.display === "block";
      if (profileMenu) {
        profileMenu.style.display = isVisible ? "none" : "block";
      }
      profileBtn.setAttribute("aria-expanded", isVisible ? "false" : "true");
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      const wrapper = document.getElementById("header-user-profile-wrapper");
      if (wrapper && !wrapper.contains(e.target)) {
        if (profileMenu) profileMenu.style.display = "none";
        profileBtn?.setAttribute("aria-expanded", "false");
      }
    });

    // Close menu on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && profileMenu && profileMenu.style.display === "block") {
        profileMenu.style.display = "none";
        profileBtn?.setAttribute("aria-expanded", "false");
      }
    });

    // Logout action from profile popover
    document.getElementById("btn-menu-logout")?.addEventListener("click", () => {
      if (profileMenu) profileMenu.style.display = "none";
      profileBtn?.setAttribute("aria-expanded", "false");
      AuthModal.logout();
    });

    // Delete account action from profile popover
    document.getElementById("btn-menu-delete-account")?.addEventListener("click", () => {
      if (profileMenu) profileMenu.style.display = "none";
      profileBtn?.setAttribute("aria-expanded", "false");
      AuthModal.deleteAccount();
    });
  },

  setupShowcaseCarousel() {
    const carousel = document.getElementById("showcase-carousel");
    const dots = document.querySelectorAll("#showcase-dots .showcase-dot");
    if (!carousel || dots.length === 0) return;

    let isProgrammaticScroll = false;
    let scrollTimeout = null;

    // Use IntersectionObserver for silky, exact active dot tracking without scroll jank
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (isProgrammaticScroll) return;
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
              const cards = Array.from(carousel.querySelectorAll(".showcase-card"));
              const activeIndex = cards.indexOf(entry.target);
              if (activeIndex !== -1) {
                dots.forEach((dot, idx) => {
                  dot.classList.toggle("active", idx === activeIndex);
                });
              }
            }
          });
        },
        {
          root: carousel,
          threshold: 0.55,
        }
      );

      carousel.querySelectorAll(".showcase-card").forEach((card) => observer.observe(card));
    } else {
      // Fallback scroll listener
      carousel.addEventListener(
        "scroll",
        () => {
          if (isProgrammaticScroll) return;
          const scrollLeft = carousel.scrollLeft;
          const cardWidth = carousel.firstElementChild ? carousel.firstElementChild.offsetWidth : 280;
          const activeIndex = Math.round(scrollLeft / (cardWidth + 14));
          dots.forEach((dot, idx) => {
            dot.classList.toggle("active", idx === activeIndex);
          });
        },
        { passive: true }
      );
    }

    // Dot click handling with horizontal-only smooth scroll
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const index = parseInt(dot.getAttribute("data-index"), 10);
        const cards = carousel.querySelectorAll(".showcase-card");
        const targetCard = cards[index];
        if (targetCard) {
          isProgrammaticScroll = true;
          dots.forEach((d, idx) => d.classList.toggle("active", idx === index));

          const targetScrollLeft = targetCard.offsetLeft - (carousel.clientWidth - targetCard.clientWidth) / 2;
          carousel.scrollTo({
            left: Math.max(0, targetScrollLeft),
            behavior: "smooth",
          });

          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            isProgrammaticScroll = false;
          }, 450);
        }
      });
    });
  },

  setupPrivacyModal() {
    const modal = document.getElementById("modal-privacy");
    const closeBtn = document.getElementById("btn-close-privacy");
    const dismissBtn = document.getElementById("btn-dismiss-privacy");
    const openBtns = document.querySelectorAll(".btn-open-privacy, #btn-open-privacy");

    const openModal = () => {
      modal?.classList.add("open");
    };

    const closeModal = () => {
      modal?.classList.remove("open");
      if (window.location.hash === "#privacy" || window.location.hash === "#privacy-policy") {
        if (this.currentUser) {
          this.navigateToTrips();
        } else {
          this.navigateToAuth();
        }
      }
    };

    openBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        openModal();
      });
    });

    closeBtn?.addEventListener("click", closeModal);
    dismissBtn?.addEventListener("click", closeModal);

    modal?.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal?.classList.contains("open")) {
        closeModal();
      }
    });

    this.openPrivacyModal = openModal;
    this.closePrivacyModal = closeModal;
  },

  navigateToTrips() {
    if (window.location.hash === "#trips") {
      this.showTripsView();
    } else {
      window.location.hash = "#trips";
    }
  },

  navigateToAuth() {
    if (window.location.hash === "#auth" || window.location.hash === "" || window.location.hash === "#") {
      this.showAuthView();
    } else {
      window.location.hash = "#auth";
    }
  },

  navigateToTimeline(tripId) {
    window.location.hash = `#trip/${tripId}`;
  },

  showAuthView() {
    this.currentView = "auth";
    this.activeTripId = null;

    document.getElementById("view-auth")?.classList.add("active");
    document.getElementById("view-trips")?.classList.remove("active");
    document.getElementById("view-timeline")?.classList.remove("active");
    document.querySelector(".app-container")?.classList.remove("spread-active");

    // Header updates: Hide back button on sign in page
    const backBtn = document.getElementById("btn-back-to-trips");
    if (backBtn) backBtn.style.display = "none";

    // Hide sign in button in navbar while on sign in page
    const authBtn = document.getElementById("btn-header-auth");
    if (authBtn) authBtn.style.display = "none";

    window.scrollTo(0, 0);

    if (window.AuthModal && typeof window.AuthModal.updateAuthPageState === "function") {
      window.AuthModal.updateAuthPageState();
    }
  },

  showTripsView() {
    this.currentView = "trips";
    this.activeTripId = null;

    document.getElementById("view-trips")?.classList.add("active");
    document.getElementById("view-auth")?.classList.remove("active");
    document.getElementById("view-timeline")?.classList.remove("active");
    document.querySelector(".app-container")?.classList.remove("spread-active");

    // Header updates
    const backBtn = document.getElementById("btn-back-to-trips");
    if (backBtn) backBtn.style.display = "none";

    this.updateUserHeader();

    // Load trips
    TripsView.loadTrips();
  },

  showTimelineView(tripId) {
    this.currentView = "timeline";
    this.activeTripId = tripId;

    document.getElementById("view-timeline")?.classList.add("active");
    document.getElementById("view-trips")?.classList.remove("active");
    document.getElementById("view-auth")?.classList.remove("active");

    // Header updates: Show back button on timeline
    const backBtn = document.getElementById("btn-back-to-trips");
    if (backBtn) backBtn.style.display = "inline-flex";

    // Load timeline
    MomentsView.loadTimeline(tripId);
  },

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "error" : ""}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-8px)";
      toast.style.transition = "all 0.2s ease";
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  },

  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((reg) => {
            console.log("ServiceWorker registered successfully:", reg.scope);
          })
          .catch((err) => {
            console.warn("ServiceWorker registration failed:", err);
          });
      });
    }
  },
};

// Start application on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => App.init());

window.App = App;
