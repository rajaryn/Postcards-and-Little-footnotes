/**
 * Trips Management View Module
 */
const TripsView = {
  container: document.getElementById("trips-container"),
  modal: document.getElementById("modal-create-trip"),
  form: document.getElementById("form-create-trip"),
  trips: [],
  isSpreadMode: false,

  calendar: {
    viewDate: new Date(),
    startDate: null,
    endDate: null,
    isPickingEnd: false,
    activePreset: "none",
  },

  init() {
    // Check saved view preference
    try {
      this.isSpreadMode = localStorage.getItem("trips_view_mode") === "spread";
    } catch (e) {
      this.isSpreadMode = false;
    }

    this.bindEvents();
    this.initCalendar();
    this.bindSwipeToDismiss();
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

    // Handle escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal?.classList.contains("open")) {
        this.closeModal();
      }
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

  formatDateLocalYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },

  initCalendar() {
    // Preset chips
    document.querySelectorAll(".trip-preset-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const preset = chip.getAttribute("data-preset");
        this.setPreset(preset);
      });
    });

    // Month Navigation
    document.getElementById("btn-cal-prev")?.addEventListener("click", () => {
      this.calendar.viewDate.setMonth(this.calendar.viewDate.getMonth() - 1);
      this.renderCalendar();
    });

    document.getElementById("btn-cal-next")?.addEventListener("click", () => {
      this.calendar.viewDate.setMonth(this.calendar.viewDate.getMonth() + 1);
      this.renderCalendar();
    });

    // Clear Button in Date Stamp
    document.getElementById("btn-clear-custom-dates")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.setPreset("none");
    });

    // Click on date stamp card toggles calendar
    document.getElementById("trip-date-stamp-card")?.addEventListener("click", () => {
      const widget = document.getElementById("paper-calendar-widget");
      if (widget) {
        const isHidden = widget.style.display === "none";
        widget.style.display = isHidden ? "block" : "none";
        if (isHidden) {
          this.setPresetChipActive("custom");
          this.renderCalendar();
        }
      }
    });
  },

  setPreset(preset) {
    this.calendar.activePreset = preset;
    const now = new Date();

    if (preset === "ongoing") {
      this.calendar.startDate = this.formatDateLocalYMD(now);
      this.calendar.endDate = null;
      this.calendar.isPickingEnd = false;
      this.hideCalendarWidget();
    } else if (preset === "weekend") {
      const day = now.getDay();
      const sat = new Date(now);
      const sun = new Date(now);
      if (day === 6) {
        sun.setDate(now.getDate() + 1);
      } else if (day === 0) {
        sat.setDate(now.getDate() - 1);
      } else {
        const daysUntilSat = 6 - day;
        sat.setDate(now.getDate() + daysUntilSat);
        sun.setDate(sat.getDate() + 1);
      }
      this.calendar.startDate = this.formatDateLocalYMD(sat);
      this.calendar.endDate = this.formatDateLocalYMD(sun);
      this.calendar.isPickingEnd = false;
      this.hideCalendarWidget();
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      this.calendar.startDate = this.formatDateLocalYMD(firstDay);
      this.calendar.endDate = this.formatDateLocalYMD(lastDay);
      this.calendar.isPickingEnd = false;
      this.hideCalendarWidget();
    } else if (preset === "custom") {
      const widget = document.getElementById("paper-calendar-widget");
      if (widget) {
        widget.style.display = widget.style.display === "none" ? "block" : "none";
      }
      if (this.calendar.startDate) {
        const d = this.parseLocalDate(this.calendar.startDate);
        if (d) this.calendar.viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
      }
    } else if (preset === "none") {
      this.calendar.startDate = null;
      this.calendar.endDate = null;
      this.calendar.isPickingEnd = false;
      this.hideCalendarWidget();
    }

    this.setPresetChipActive(preset);
    this.syncHiddenDateInputs();
    this.updateDateStampUI();
    this.renderCalendar();
  },

  setPresetChipActive(preset) {
    document.querySelectorAll(".trip-preset-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.getAttribute("data-preset") === preset);
    });
  },

  hideCalendarWidget() {
    const widget = document.getElementById("paper-calendar-widget");
    if (widget) widget.style.display = "none";
  },

  syncHiddenDateInputs() {
    const startInput = document.getElementById("input-trip-start");
    const endInput = document.getElementById("input-trip-end");
    if (startInput) startInput.value = this.calendar.startDate || "";
    if (endInput) endInput.value = this.calendar.endDate || "";
  },

  updateDateStampUI() {
    const textEl = document.getElementById("trip-date-stamp-text");
    const cardEl = document.getElementById("trip-date-stamp-card");
    const clearBtn = document.getElementById("btn-clear-custom-dates");
    if (!textEl || !cardEl) return;

    const { startDate, endDate, activePreset } = this.calendar;

    if (startDate && endDate) {
      const s = this.parseLocalDate(startDate);
      const e = this.parseLocalDate(endDate);
      const diffMs = e.getTime() - s.getTime();
      const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
      const dayLabel = days === 1 ? "1 day" : `${days} days`;
      textEl.textContent = `${this.formatTripDates(startDate, endDate)} · ${dayLabel}`;
      cardEl.classList.add("has-dates");
      if (clearBtn) clearBtn.style.display = "inline-flex";
    } else if (startDate) {
      if (activePreset === "ongoing") {
        textEl.textContent = `Ongoing · Started ${this.formatTripDates(startDate)}`;
      } else {
        textEl.textContent = `Starts ${this.formatTripDates(startDate)} · (tap return date)`;
      }
      cardEl.classList.add("has-dates");
      if (clearBtn) clearBtn.style.display = "inline-flex";
    } else {
      textEl.textContent = "No specific dates · Quiet journey";
      cardEl.classList.remove("has-dates");
      if (clearBtn) clearBtn.style.display = "none";
    }
  },

  renderCalendar() {
    const grid = document.getElementById("calendar-days-grid");
    const monthLabel = document.getElementById("calendar-month-year-label");
    if (!grid || !monthLabel) return;

    const view = this.calendar.viewDate;
    const year = view.getFullYear();
    const month = view.getMonth();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    monthLabel.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = this.formatDateLocalYMD(new Date());
    const { startDate, endDate } = this.calendar;

    let cellsHtml = "";

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = this.formatDateLocalYMD(prevDate);
      cellsHtml += `
        <div class="cal-day-cell is-other-month">
          <button type="button" class="cal-day-btn" data-date="${dateStr}">${dayNum}</button>
        </div>
      `;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const currDate = new Date(year, month, day);
      const dateStr = this.formatDateLocalYMD(currDate);

      const isToday = dateStr === todayStr;
      const isStart = dateStr === startDate;
      const isEnd = dateStr === endDate;
      const isSelected = isStart || isEnd;
      const isInRange = startDate && endDate && dateStr >= startDate && dateStr <= endDate;

      let cellClasses = ["cal-day-cell"];
      if (isToday) cellClasses.push("is-today");
      if (isStart) cellClasses.push("is-range-start");
      if (isEnd) cellClasses.push("is-range-end");
      if (isSelected) cellClasses.push("is-selected");
      if (isInRange && !isSelected) cellClasses.push("is-in-range");

      cellsHtml += `
        <div class="${cellClasses.join(" ")}">
          <button type="button" class="cal-day-btn" data-date="${dateStr}">${day}</button>
        </div>
      `;
    }

    // Next month padding days to complete row/grid
    const totalRendered = firstDayIndex + daysInMonth;
    const remaining = totalRendered % 7 === 0 ? 0 : 7 - (totalRendered % 7);
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      const dateStr = this.formatDateLocalYMD(nextDate);
      cellsHtml += `
        <div class="cal-day-cell is-other-month">
          <button type="button" class="cal-day-btn" data-date="${dateStr}">${nextDay}</button>
        </div>
      `;
    }

    grid.innerHTML = cellsHtml;

    // Attach click listeners to all day buttons
    grid.querySelectorAll(".cal-day-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dateStr = btn.getAttribute("data-date");
        this.handleCalendarDayClick(dateStr);
      });
    });
  },

  handleCalendarDayClick(dateStr) {
    if (!this.calendar.isPickingEnd || !this.calendar.startDate) {
      // First tap = start date
      this.calendar.startDate = dateStr;
      this.calendar.endDate = null;
      this.calendar.isPickingEnd = true;
    } else {
      // Second tap = end date
      if (dateStr < this.calendar.startDate) {
        this.calendar.startDate = dateStr;
        this.calendar.endDate = null;
        this.calendar.isPickingEnd = true;
      } else if (dateStr === this.calendar.startDate) {
        this.calendar.endDate = null;
        this.calendar.isPickingEnd = false;
      } else {
        this.calendar.endDate = dateStr;
        this.calendar.isPickingEnd = false;
      }
    }

    this.calendar.activePreset = "custom";
    this.setPresetChipActive("custom");
    this.syncHiddenDateInputs();
    this.updateDateStampUI();
    this.renderCalendar();
  },

  bindSwipeToDismiss() {
    const content = this.modal?.querySelector(".modal-content");
    const handle = document.getElementById("create-trip-drag-handle");
    const header = this.modal?.querySelector(".modal-header");
    if (!content) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const onTouchStart = (e) => {
      if (content.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        content.style.transition = "none";
      }
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        content.style.transform = `translateY(${deltaY}px)`;
        if (e.cancelable) e.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      content.style.transition = "transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)";
      const deltaY = currentY - startY;
      if (deltaY > 75) {
        this.closeModal();
      } else {
        content.style.transform = "";
      }
    };

    handle?.addEventListener("touchstart", onTouchStart, { passive: true });
    handle?.addEventListener("touchmove", onTouchMove, { passive: false });
    handle?.addEventListener("touchend", onTouchEnd, { passive: true });

    header?.addEventListener("touchstart", onTouchStart, { passive: true });
    header?.addEventListener("touchmove", onTouchMove, { passive: false });
    header?.addEventListener("touchend", onTouchEnd, { passive: true });
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
    this.form?.reset();
    const content = this.modal?.querySelector(".modal-content");
    if (content) content.style.transform = "";

    // Reset calendar to undated
    this.calendar.viewDate = new Date();
    this.calendar.startDate = null;
    this.calendar.endDate = null;
    this.calendar.isPickingEnd = false;
    this.calendar.activePreset = "none";
    this.setPresetChipActive("none");
    this.syncHiddenDateInputs();
    this.updateDateStampUI();
    this.hideCalendarWidget();

    App.lockScroll();
    this.modal?.classList.add("open");
    setTimeout(() => {
      document.getElementById("input-trip-name")?.focus();
    }, 50);
  },

  closeModal() {
    this.modal?.classList.remove("open");
    const content = this.modal?.querySelector(".modal-content");
    if (content) content.style.transform = "";
    App.unlockScroll();
  },

  async loadTrips() {
    try {
      this.container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px 0;">Loading your trips...</div>`;
      
      // Check in-app pending invitations concurrently
      if (window.InvitationController && typeof window.InvitationController.checkPendingInvitations === "function") {
        window.InvitationController.checkPendingInvitations(true);
      }

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
        const isCreator = !trip.user_role || trip.user_role === "creator";
        const sharedSummary = trip.is_shared && trip.members_summary ? `<div class="trip-shared-with font-script">with ${this.escapeHtml(trip.members_summary)}</div>` : "";
        const deleteBtn = isCreator
          ? `
            <div class="trip-actions" onclick="event.stopPropagation();">
              <button class="memory-action-btn" title="Forget this trip" aria-label="Delete Trip" onclick="TripsView.handleDeleteTrip(${trip.id}, '${this.escapeHtml(trip.name)}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          `
          : "";

        return `
          <div class="trip-entry ${offsetClass} ${trip.is_shared ? "is-shared-trip" : ""}" data-trip-id="${trip.id}">
            <div class="trip-entry-content">
              <div class="trip-entry-header">
                <h3 class="trip-title title-serif">${this.escapeHtml(trip.name)}</h3>
                ${deleteBtn}
              </div>
              <div class="trip-dates">${dateStr}</div>
              ${sharedSummary}
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
      const sharedSpreadNote = trip.is_shared && trip.members_summary ? `<span class="trip-spread-shared font-script">with ${this.escapeHtml(trip.members_summary)}</span>` : "";

      html += `
        <div class="trip-spread-card ${trip.is_shared ? "is-shared-trip" : ""}" data-trip-id="${trip.id}" title="Open ${this.escapeHtml(trip.name)}">
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
            ${sharedSpreadNote}
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
    const confirmed = await App.confirm({
      title: "delete trip",
      message: `Are you sure you want to delete "${tripName}" and all its recorded moments, photographs, and quiet footnotes?`,
      confirmText: "yes, delete trip",
      cancelText: "keep trip",
      isDanger: true,
      warning: "All moments and photos in this trip will be permanently removed.",
    });

    if (!confirmed) {
      return;
    }

    try {
      await API.deleteTrip(tripId);
      App.showToast("Trip deleted.");
      App.navigateToTrips();
    } catch (err) {
      if (err.status === 404 || (err.message && (err.message.toLowerCase().includes("not found") || err.message.toLowerCase().includes("trip not found")))) {
        App.showToast("Trip was already deleted.");
        App.navigateToTrips();
      } else {
        App.showToast(err.message || "Failed to delete trip", "error");
      }
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
