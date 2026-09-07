/**
 * Application Core & Navigation Controller
 */
const App = {
  currentView: "trips", // "trips" or "timeline"
  activeTripId: null,

  init() {
    // Initialize submodules
    TripsView.init();
    MomentsView.init();
    CaptureModal.init();

    // Setup navigation / popstate
    this.setupRouting();
    this.setupHeader();

    // Register Service Worker for PWA
    this.registerServiceWorker();

    // Initial route handling
    this.handleRoute();
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
    this.showTripsView();
  },

  setupHeader() {
    const backBtn = document.getElementById("btn-back-to-trips");
    backBtn?.addEventListener("click", () => {
      this.navigateToTrips();
    });
  },

  navigateToTrips() {
    window.location.hash = "#trips";
  },

  navigateToTimeline(tripId) {
    window.location.hash = `#trip/${tripId}`;
  },

  showTripsView() {
    this.currentView = "trips";
    this.activeTripId = null;

    document.getElementById("view-trips")?.classList.add("active");
    document.getElementById("view-timeline")?.classList.remove("active");

    // Header updates
    document.getElementById("btn-back-to-trips").style.display = "none";
    document.getElementById("brand-header-title").style.display = "flex";

    // Load trips
    TripsView.loadTrips();
  },

  showTimelineView(tripId) {
    this.currentView = "timeline";
    this.activeTripId = tripId;

    document.getElementById("view-trips")?.classList.remove("active");
    document.getElementById("view-timeline")?.classList.add("active");

    // Header updates
    document.getElementById("btn-back-to-trips").style.display = "flex";
    document.getElementById("brand-header-title").style.display = "none";

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
