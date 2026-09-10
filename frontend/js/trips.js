/**
 * Trips Management View Module
 */
const TripsView = {
  container: document.getElementById("trips-container"),
  modal: document.getElementById("modal-create-trip"),
  form: document.getElementById("form-create-trip"),
  trips: [],
  isSpreadMode: false,

  init() {
    // Check saved view preference
    try {
      this.isSpreadMode = localStorage.getItem("trips_view_mode") === "spread";
    } catch (e) {
      this.isSpreadMode = false;
    }

    this.bindEvents();
    this.updateSwitcherUI();
  },

  bindEvents() {
    // Open create trip modal
    document.getElementById("btn-open-create-trip")?.addEventListener("click", () => {
      this.openModal();
    });

    // Close modal
    document.getElementById("btn-close-create-trip")?.addEventListener("click", () => {
      this.closeModal();
    });

    document.getElementById("btn-cancel-create-trip")?.addEventListener("click", () => {
      this.closeModal();
    });

    // Click outside modal to close
    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // Handle form submit
    this.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleCreateTrip();
    });

    // Trips view switcher (list vs zoom out)
    document.getElementById("btn-view-trips-list")?.addEventListener("click", () => {
      this.setSpreadMode(false);
    });

    document.getElementById("btn-view-trips-spread")?.addEventListener("click", () => {
      this.setSpreadMode(true);
    });
  },

  setSpreadMode(active) {
    this.isSpreadMode = !!active;

    try {
      localStorage.setItem("trips_view_mode", this.isSpreadMode ? "spread" : "list");
    } catch (e) {}

    this.updateSwitcherUI();

    const appContainer = document.querySelector(".app-container");
    if (appContainer && App.currentView === "trips") {
      appContainer.classList.toggle("spread-active", this.isSpreadMode);
    }

    this.renderCurrentView();
  },

  updateSwitcherUI() {
    const pillList = document.getElementById("btn-view-trips-list");
    const pillSpread = document.getElementById("btn-view-trips-spread");
    if (pillList && pillSpread) {
      pillList.classList.toggle("active", !this.isSpreadMode);
      pillSpread.classList.toggle("active", this.isSpreadMode);
    }

    if (this.container) {
      this.container.classList.toggle("spread-mode", this.isSpreadMode);
    }
  },

  openModal() {
    this.form.reset();
    App.lockScroll();
    this.modal.classList.add("open");
    document.getElementById("input-trip-name")?.focus();
  },

  closeModal() {
    this.modal.classList.remove("open");
    App.unlockScroll();
  },

  async loadTrips() {
    try {
      this.container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px 0;">Loading your trips...</div>`;
      const trips = await API.getTrips();
      this.trips = trips || [];
      this.renderCurrentView();
    } catch (err) {
      this.container.innerHTML = `
        <div class="empty-state">
          <h2 class="empty-state-title title-serif">Couldn't load trips</h2>
          <p class="empty-state-text">${err.message || "Please check your connection and try again."}</p>
          <button class="btn-secondary" onclick="TripsView.loadTrips()">Retry</button>
        </div>
      `;
    }
  },

  renderCurrentView() {
    if (!this.trips || this.trips.length === 0) {
      this.container.innerHTML = `
        <div class="empty-collection">
          <h2 class="empty-title title-serif">Nothing here yet.</h2>
          <p class="empty-subtitle">Start with somewhere you've been.</p>
          <button class="btn-quiet-action" onclick="TripsView.openModal()">
            + new trip
          </button>
        </div>
      `;
      return;
    }

    if (this.isSpreadMode) {
      this.renderSpread(this.trips);
    } else {
      this.renderList(this.trips);
    }
  },

  renderList(trips) {
    this.container.innerHTML = trips
      .map((trip, index) => {
        const dateStr = this.formatTripDates(trip.start_date, trip.end_date, trip.created_at);
        const momentCount = trip.moment_count || 0;
        const momentLabel = momentCount === 1 ? "1 moment" : `${momentCount} moments`;
        const offsetClass = index % 2 === 1 ? "trip-entry-offset" : "trip-entry-main";

        return `
          <div class="trip-entry ${offsetClass}" data-trip-id="${trip.id}">
            <div class="trip-entry-content">
              <div class="trip-entry-header">
                <h3 class="trip-title title-serif">${this.escapeHtml(trip.name)}</h3>
                <div class="trip-actions" onclick="event.stopPropagation();">
                  <button class="memory-action-btn" title="Forget this trip" aria-label="Delete Trip" onclick="TripsView.handleDeleteTrip(${trip.id}, '${this.escapeHtml(trip.name)}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="trip-dates">${dateStr}</div>
              <div class="trip-meta-row">
                <span class="trip-moment-count">${momentLabel}</span>
                <span class="trip-arrow">open &rarr;</span>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // Add click listeners to entries
    this.container.querySelectorAll(".trip-entry").forEach((card) => {
      card.addEventListener("click", () => {
        const tripId = card.getAttribute("data-trip-id");
        App.navigateToTimeline(tripId);
      });
    });
  },

  renderSpread(trips) {
    let html = `
      <div class="spread-overview-banner">
        <div class="spread-overview-count">
          <span class="spread-count-number">${trips.length}</span> ${trips.length === 1 ? "journey" : "journeys"} on the travel desk
        </div>
        <div class="spread-overview-hint">
          <svg class="spread-hint-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <span>tap any journey to open</span>
        </div>
      </div>

      <div class="trips-spread-grid">
    `;

    trips.forEach((trip) => {
      const momentCount = trip.moment_count || 0;
      const momentLabel = momentCount === 1 ? "1 memory" : `${momentCount} memories`;
      const tripInitial = (trip.name || "T").trim().charAt(0).toUpperCase();
      const hasCover = !!(trip.cover_photo_url || trip.photo_url);
      const coverUrl = trip.cover_photo_url || trip.photo_url;

      html += `
        <div class="trip-spread-card" data-trip-id="${trip.id}" title="Open ${this.escapeHtml(trip.name)}">
          <div class="trip-spread-thumb-wrapper">
            ${
              hasCover
                ? `<img class="trip-spread-img" src="${this.escapeHtml(coverUrl)}" alt="${this.escapeHtml(trip.name)}" loading="lazy" />`
                : `<div class="trip-spread-monogram-tile font-script">${tripInitial}</div>`
            }
            <span class="trip-spread-count-badge">${momentLabel}</span>
          </div>
          <div class="trip-spread-body">
            <h3 class="trip-spread-title title-serif">${this.escapeHtml(trip.name)}</h3>
          </div>
        </div>
      `;
    });

    html += `</div>`;

    this.container.innerHTML = html;

    // Add click listeners to spread cards
    this.container.querySelectorAll(".trip-spread-card").forEach((card) => {
      card.addEventListener("click", () => {
        const tripId = card.getAttribute("data-trip-id");
        App.navigateToTimeline(tripId);
      });
    });
  },

  async handleCreateTrip() {
    const nameInput = document.getElementById("input-trip-name");
    const startInput = document.getElementById("input-trip-start");
    const endInput = document.getElementById("input-trip-end");

    const name = nameInput.value.trim();
    if (!name) {
      App.showToast("Trip name is required", "error");
      return;
    }

    try {
      const trip = await API.createTrip({
        name,
        start_date: startInput.value || null,
        end_date: endInput.value || null,
      });

      this.closeModal();
      App.showToast(`Trip "${trip.name}" created!`);
      // Directly navigate to new trip timeline
      App.navigateToTimeline(trip.id);
    } catch (err) {
      App.showToast(err.message || "Could not create trip", "error");
    }
  },

  async handleDeleteTrip(tripId, tripName) {
    if (!confirm(`Are you sure you want to delete "${tripName}" and all its moments?`)) {
      return;
    }

    try {
      await API.deleteTrip(tripId);
      App.showToast("Trip deleted.");
      await this.loadTrips();
    } catch (err) {
      App.showToast(err.message || "Failed to delete trip", "error");
    }
  },

  parseLocalDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;

    const str = String(dateInput).trim();
    if (!str) return null;

    // 1. "YYYY-MM-DD" date-only strings (avoids UTC midnight shifting backwards)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [year, month, day] = str.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    // 2. "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DDTHH:MM"
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (isoMatch) {
      const [, y, m, d, h, min, s] = isoMatch;
      return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s || 0));
    }

    // 3. RFC-822 / GMT HTTP formats (e.g. "Tue, 08 Sep 2026 00:56:00 GMT")
    const rfcMatch = str.match(/(?:[A-Za-z]{3},\s*)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (rfcMatch) {
      const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
      const [, d, monStr, y, h, min, s] = rfcMatch;
      const m = months[monStr] ?? 0;
      return new Date(Number(y), m, Number(d), Number(h), Number(min), Number(s));
    }

    // 4. Default fallback
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  },

  formatTripDates(startDate, endDate, createdAt) {
    if (startDate && endDate) {
      const s = this.parseLocalDate(startDate);
      const e = this.parseLocalDate(endDate);
      const opts = { month: "short", day: "numeric" };
      const sStr = s ? s.toLocaleDateString("en-US", opts) : "";
      const eStr = e ? e.toLocaleDateString("en-US", { ...opts, year: "numeric" }) : "";
      return sStr && eStr ? `${sStr} – ${eStr}` : sStr || eStr || "Recent trip";
    } else if (startDate) {
      const s = this.parseLocalDate(startDate);
      return s ? s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent trip";
    } else if (createdAt) {
      const c = this.parseLocalDate(createdAt);
      return c ? c.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recent trip";
    }
    return "Recent trip";
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
};

window.TripsView = TripsView;
