/**
 * Timeline & Moments View Module with Desk Spread (Zoom Out) & Flexible Timestamps
 */
const MomentsView = {
  currentTripId: null,
  currentTrip: null,
  moments: [],
  isSpreadMode: false,
  container: document.getElementById("timeline-moments-container"),
  tripTitleEl: document.getElementById("timeline-trip-name"),
  tripDatesEl: document.getElementById("timeline-trip-dates"),

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Header quick spread toggle
    document.getElementById("btn-toggle-spread")?.addEventListener("click", () => {
      this.toggleSpreadMode();
    });

    // Timeline vs Spread switcher pills
    document.getElementById("btn-view-timeline")?.addEventListener("click", () => {
      this.setSpreadMode(false);
    });

    document.getElementById("btn-view-spread")?.addEventListener("click", () => {
      this.setSpreadMode(true);
    });

    // Timeline delete trip button
    document.getElementById("btn-delete-current-trip")?.addEventListener("click", () => {
      this.handleDeleteCurrentTrip();
    });
  },

  setSpreadMode(active) {
    this.isSpreadMode = !!active;

    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
      appContainer.classList.toggle("spread-active", this.isSpreadMode);
    }

    if (this.container) {
      this.container.classList.toggle("spread-mode", this.isSpreadMode);
    }

    // Update switcher pills
    const pillTimeline = document.getElementById("btn-view-timeline");
    const pillSpread = document.getElementById("btn-view-spread");
    if (pillTimeline && pillSpread) {
      pillTimeline.classList.toggle("active", !this.isSpreadMode);
      pillSpread.classList.toggle("active", this.isSpreadMode);
    }

    // Update header spread button icon and label
    const headerBtn = document.getElementById("btn-toggle-spread");
    const label = document.getElementById("label-toggle-spread");
    const iconSpread = headerBtn?.querySelector(".icon-spread");
    const iconTimeline = headerBtn?.querySelector(".icon-timeline");

    if (label) {
      label.textContent = this.isSpreadMode ? "focus view" : "zoom out";
    }
    if (iconSpread && iconTimeline) {
      iconSpread.style.display = this.isSpreadMode ? "none" : "block";
      iconTimeline.style.display = this.isSpreadMode ? "block" : "none";
    }

    // Re-render
    this.renderCurrentView();
  },

  toggleSpreadMode() {
    this.setSpreadMode(!this.isSpreadMode);
  },

  async loadTimeline(tripId) {
    this.currentTripId = tripId;
    this.container.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px 0;">Loading timeline...</div>`;

    try {
      // Load trip info and moments in parallel
      const [trip, moments] = await Promise.all([
        API.getTrip(tripId),
        API.getTripMoments(tripId),
      ]);

      this.currentTrip = trip;
      this.moments = moments || [];
      this.renderHeader(trip);
      this.renderCurrentView();
    } catch (err) {
      this.container.innerHTML = `
        <div class="empty-state">
          <h2 class="empty-state-title title-serif">Couldn't load timeline</h2>
          <p class="empty-state-text">${err.message || "Please try again."}</p>
          <button class="btn-secondary" onclick="MomentsView.loadTimeline(${tripId})">Retry</button>
        </div>
      `;
    }
  },

  renderHeader(trip) {
    if (this.tripTitleEl) this.tripTitleEl.textContent = trip.name;
    if (this.tripDatesEl) {
      this.tripDatesEl.textContent = TripsView.formatTripDates(trip.start_date, trip.end_date, trip.created_at);
    }
  },

  renderCurrentView() {
    if (!this.moments || this.moments.length === 0) {
      this.container.innerHTML = `
        <div class="empty-timeline">
          <h2 class="empty-title title-serif">This trip is just getting started.</h2>
          <p class="empty-subtitle">Capture a photograph or write a footnote to begin the story.</p>
          <button class="btn-quiet-action" onclick="CaptureModal.openModal(${this.currentTripId})">
            + add a moment
          </button>
        </div>
      `;
      return;
    }

    if (this.isSpreadMode) {
      this.renderSpread(this.moments);
    } else {
      this.renderTimeline(this.moments);
    }
  },

  renderTimeline(moments) {
    // Group moments by calendar day
    const dayGroups = this.groupMomentsByDay(moments);
    const numberWords = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE"];

    let html = "";
    dayGroups.forEach((group, index) => {
      const dayWord = numberWords[index] || String(index + 1);
      const dateLabel = group.dateLabel;

      html += `
        <section class="day-chapter">
          <div class="day-chapter-header">
            <div class="day-chapter-divider" aria-hidden="true"></div>
            <div class="day-chapter-heading-row">
              <span class="day-chapter-title">DAY ${dayWord}</span>
              <span class="day-chapter-dot" aria-hidden="true">&middot;</span>
              <span class="day-chapter-date">${this.escapeHtml(dateLabel)}</span>
            </div>
            <div class="day-chapter-divider" aria-hidden="true"></div>
          </div>
          <div class="timeline-compositions">
            ${group.moments.map((m, mIndex) => this.renderMomentComposition(m, mIndex, group.moments.length)).join("")}
          </div>
        </section>
      `;
    });

    this.container.innerHTML = html;
  },

  renderSpread(moments) {
    const dayGroups = this.groupMomentsByDay(moments);
    const numberWords = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE"];

    let html = `
      <div class="spread-overview-banner">
        <div class="spread-overview-count">
          <span class="spread-count-number">${moments.length}</span> ${moments.length === 1 ? "memory" : "memories"} on the travel desk
        </div>
        <div class="spread-overview-hint">
          <svg class="spread-hint-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <span>tap any postcard or note to zoom in</span>
        </div>
      </div>
    `;

    dayGroups.forEach((group, index) => {
      const dayWord = numberWords[index] || String(index + 1);
      const formattedDate = group.dateLabel.toUpperCase();

      html += `
        <section class="day-chapter spread-chapter">
          <div class="spread-chapter-header">
            <span class="spread-chapter-badge">DAY ${dayWord}</span>
            <span class="spread-chapter-date">${formattedDate}</span>
          </div>
          <div class="spread-compositions-grid">
            ${group.moments.map((m, mIndex) => this.renderSpreadItem(m, mIndex)).join("")}
          </div>
        </section>
      `;
    });

    this.container.innerHTML = html;
  },

  renderSpreadItem(m, index) {
    const timeStr = this.formatTime(m.created_at);
    const photoUrl = m.photo_url || (m.photo_path ? `/uploads/${m.photo_path}` : null);
    const hasPhoto = !!photoUrl;
    const hasCaption = !!(m.caption && m.caption.trim());
    const countNumber = String(index + 1).padStart(2, "0");

    if (hasPhoto) {
      return `
        <div class="spread-item spread-item-postcard" onclick="MomentsView.zoomIntoMoment(${m.id})" title="Focus on this postcard">
          <div class="spread-postcard-thumb-wrapper">
            <img class="spread-postcard-img" src="${this.escapeHtml(photoUrl)}" alt="Memory print" loading="lazy" />
          </div>
          <div class="spread-item-footer">
            <div class="spread-item-meta">
              <span class="spread-index">${countNumber}</span>
              ${timeStr ? `<span class="spread-time">${timeStr}</span>` : ""}
            </div>
            ${hasCaption ? `<p class="spread-caption-snippet">${this.escapeHtml(m.caption)}</p>` : ""}
          </div>
        </div>
      `;
    }

    return `
      <div class="spread-item spread-item-footnote" onclick="MomentsView.zoomIntoMoment(${m.id})" title="Focus on this footnote">
        <div class="spread-footnote-sheet">
          <div class="spread-item-meta">
            <span class="spread-index">${countNumber}</span>
            ${timeStr ? `<span class="spread-time">${timeStr}</span>` : ""}
          </div>
          <p class="spread-footnote-text">${this.escapeHtml(m.caption)}</p>
          <span class="spread-footnote-tag">— footnote</span>
        </div>
      </div>
    `;
  },

  zoomIntoMoment(momentId) {
    // Switch to vertical timeline mode
    this.setSpreadMode(false);

    // Scroll smoothly to the target moment
    setTimeout(() => {
      const target = document.getElementById(`moment-${momentId}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("moment-spotlight");
        setTimeout(() => target.classList.remove("moment-spotlight"), 1800);
      }
    }, 100);
  },

  renderMomentComposition(m, index, totalInDay) {
    const timeStr = this.formatTime(m.created_at);
    const photoUrl = m.photo_url || (m.photo_path ? `/uploads/${m.photo_path}` : null);
    const hasPhoto = !!photoUrl;
    const hasCaption = !!(m.caption && m.caption.trim());
    const countNumber = String(index + 1).padStart(2, "0");

    const deleteMomentBtn = `
      <button class="memory-action-btn" title="Delete entire moment" aria-label="Delete entire moment" onclick="MomentsView.handleDeleteMoment(${m.id})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    // Composition variations based on position
    const compTypes = ["composition-large", "composition-offset-left", "composition-medium", "composition-offset-right"];
    const compClass = compTypes[index % compTypes.length];

    const separatorDot = index < totalInDay - 1 ? `<div class="memory-separator-dot" aria-hidden="true">·</div>` : "";
    const timeMarkup = timeStr ? `<time class="memory-timestamp">${timeStr}</time>` : `<span class="memory-timestamp-blank"></span>`;

    // CASE 1: Photo + Footnote (Postcard Print with Marginalia)
    if (hasPhoto && hasCaption) {
      return `
        <article class="memory-composition ${compClass} with-photo with-footnote" id="moment-${m.id}">
          <div class="memory-time-row">
            ${timeMarkup}
            <span class="memory-index-mark">${countNumber}</span>
            ${deleteMomentBtn}
          </div>

          <div class="postcard-print-wrapper">
            <img class="postcard-photo" src="${this.escapeHtml(photoUrl)}" alt="Photograph from journey" loading="lazy" />
            <div class="photo-overlay-actions">
              <button type="button" class="photo-delete-action-btn" title="Delete photo from this moment" aria-label="Delete Photo" onclick="event.stopPropagation(); MomentsView.handleDeletePhoto(${m.id})">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>delete photo</span>
              </button>
            </div>
          </div>

          <div class="little-footnote-block">
            <p class="footnote-prose">${this.escapeHtml(m.caption)}</p>
            <div class="footnote-footer-row">
              <span class="footnote-tag">— a little footnote</span>
              <button type="button" class="footnote-delete-action-btn" title="Delete footnote" aria-label="Delete footnote" onclick="event.stopPropagation(); MomentsView.handleDeleteFootnote(${m.id})">
                delete footnote
              </button>
            </div>
          </div>

          ${separatorDot}
        </article>
      `;
    }

    // CASE 2: Photo Only (Postcard Print)
    if (hasPhoto && !hasCaption) {
      return `
        <article class="memory-composition ${compClass} with-photo photo-only" id="moment-${m.id}">
          <div class="memory-time-row">
            ${timeMarkup}
            <span class="memory-index-mark">${countNumber}</span>
            <button class="memory-action-btn" title="Delete photo" aria-label="Delete photo" onclick="MomentsView.handleDeletePhoto(${m.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>

          <div class="postcard-print-wrapper">
            <img class="postcard-photo" src="${this.escapeHtml(photoUrl)}" alt="Photograph from journey" loading="lazy" />
            <div class="photo-overlay-actions">
              <button type="button" class="photo-delete-action-btn" title="Delete photo" aria-label="Delete Photo" onclick="event.stopPropagation(); MomentsView.handleDeletePhoto(${m.id})">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>delete photo</span>
              </button>
            </div>
          </div>

          ${separatorDot}
        </article>
      `;
    }

    // CASE 3: Footnote Only (Intimate piece of writing directly on the desk)
    return `
      <article class="memory-composition composition-footnote-only with-footnote text-only" id="moment-${m.id}">
        <div class="memory-time-row">
          ${timeMarkup}
          <span class="memory-index-mark">${countNumber}</span>
          <button class="memory-action-btn" title="Delete footnote" aria-label="Delete footnote" onclick="MomentsView.handleDeleteFootnote(${m.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>

        <div class="loose-footnote-sheet">
          <p class="footnote-prose single-thought">${this.escapeHtml(m.caption)}</p>
          <div class="footnote-footer-row">
            <span class="footnote-tag">— little footnote</span>
            <button type="button" class="footnote-delete-action-btn" title="Delete footnote" aria-label="Delete footnote" onclick="event.stopPropagation(); MomentsView.handleDeleteFootnote(${m.id})">
              delete footnote
            </button>
          </div>
        </div>

        ${separatorDot}
      </article>
    `;
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

  groupMomentsByDay(moments) {
    const map = new Map();

    moments.forEach((m) => {
      const d = this.parseLocalDate(m.created_at) || new Date();
      // Key by year-month-day in local time
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dateLabel = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });

      if (!map.has(key)) {
        map.set(key, { key, dateLabel, moments: [] });
      }
      map.get(key).moments.push(m);
    });

    return Array.from(map.values());
  },

  async handleDeleteCurrentTrip() {
    if (!this.currentTripId) return;
    const name = this.currentTrip?.name || "this trip";
    await TripsView.handleDeleteTrip(this.currentTripId, name);
  },

  async handleDeleteMoment(momentId) {
    if (!confirm("Delete this moment and all its contents?")) return;

    try {
      await API.deleteMoment(momentId);
      App.showToast("Moment deleted.");
      // Reload timeline
      await this.loadTimeline(this.currentTripId);
    } catch (err) {
      App.showToast(err.message || "Could not delete moment", "error");
    }
  },

  async handleDeletePhoto(momentId) {
    if (!confirm("Delete this photograph from the trip?")) return;

    try {
      await API.deleteMomentPhoto(momentId);
      App.showToast("Photograph deleted.");
      await this.loadTimeline(this.currentTripId);
    } catch (err) {
      App.showToast(err.message || "Could not delete photo", "error");
    }
  },

  async handleDeleteFootnote(momentId) {
    if (!confirm("Delete this footnote?")) return;

    try {
      await API.deleteMomentFootnote(momentId);
      App.showToast("Footnote deleted.");
      await this.loadTimeline(this.currentTripId);
    } catch (err) {
      App.showToast(err.message || "Could not delete footnote", "error");
    }
  },

  formatTime(dateString) {
    if (!dateString) return "";
    const d = this.parseLocalDate(dateString);
    if (!d) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
};

window.MomentsView = MomentsView;

