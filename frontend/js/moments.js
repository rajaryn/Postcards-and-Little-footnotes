/**
 * Timeline & Moments View Module with Presigned Photo URLs
 */
const MomentsView = {
  currentTripId: null,
  currentTrip: null,
  container: document.getElementById("timeline-moments-container"),
  tripTitleEl: document.getElementById("timeline-trip-name"),
  tripDatesEl: document.getElementById("timeline-trip-dates"),

  init() {
    // Event bindings if any
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
      this.renderHeader(trip);
      this.renderTimeline(moments);
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

  renderTimeline(moments) {
    if (!moments || moments.length === 0) {
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

    // Group moments by calendar day
    const dayGroups = this.groupMomentsByDay(moments);
    const numberWords = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE"];

    let html = "";
    dayGroups.forEach((group, index) => {
      const dayWord = numberWords[index] || String(index + 1);
      const formattedDate = group.dateLabel.toUpperCase();

      html += `
        <section class="day-chapter">
          <div class="day-chapter-header">
            <div class="day-chapter-divider" aria-hidden="true"></div>
            <div class="day-chapter-title title-serif">DAY ${dayWord}</div>
            <div class="day-chapter-date">${formattedDate}</div>
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

  renderMomentComposition(m, index, totalInDay) {
    const timeStr = this.formatTime(m.created_at);
    const photoUrl = m.photo_url || (m.photo_path ? `/uploads/${m.photo_path}` : null);
    const hasPhoto = !!photoUrl;
    const hasCaption = !!(m.caption && m.caption.trim());
    const countNumber = String(index + 1).padStart(2, "0");

    const deleteBtn = `
      <button class="memory-action-btn" title="Forget this moment" aria-label="Forget this moment" onclick="MomentsView.handleDeleteMoment(${m.id})">
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

    // CASE 1: Photo + Footnote (Postcard Print with Marginalia)
    if (hasPhoto && hasCaption) {
      return `
        <article class="memory-composition ${compClass} with-photo with-footnote" id="moment-${m.id}">
          <div class="memory-time-row">
            <time class="memory-timestamp">${timeStr}</time>
            <span class="memory-index-mark">${countNumber}</span>
            ${deleteBtn}
          </div>

          <div class="postcard-print-wrapper">
            <img class="postcard-photo" src="${this.escapeHtml(photoUrl)}" alt="Photograph from journey" loading="lazy" />
          </div>

          <div class="little-footnote-block">
            <p class="footnote-prose">${this.escapeHtml(m.caption)}</p>
            <span class="footnote-tag">— a little footnote</span>
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
            <time class="memory-timestamp">${timeStr}</time>
            <span class="memory-index-mark">${countNumber}</span>
            ${deleteBtn}
          </div>

          <div class="postcard-print-wrapper">
            <img class="postcard-photo" src="${this.escapeHtml(photoUrl)}" alt="Photograph from journey" loading="lazy" />
          </div>

          ${separatorDot}
        </article>
      `;
    }

    // CASE 3: Footnote Only (Intimate piece of writing directly on the desk)
    return `
      <article class="memory-composition composition-footnote-only with-footnote text-only" id="moment-${m.id}">
        <div class="memory-time-row">
          <time class="memory-timestamp">${timeStr}</time>
          <span class="memory-index-mark">${countNumber}</span>
          ${deleteBtn}
        </div>

        <div class="loose-footnote-sheet">
          <p class="footnote-prose single-thought">${this.escapeHtml(m.caption)}</p>
          <span class="footnote-tag">— little footnote</span>
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
    // Parse the nominal wall-clock components into a local Date instance
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

  async handleDeleteMoment(momentId) {
    if (!confirm("Delete this moment?")) return;

    try {
      await API.deleteMoment(momentId);
      App.showToast("Moment deleted.");
      // Reload timeline
      await this.loadTimeline(this.currentTripId);
    } catch (err) {
      App.showToast(err.message || "Could not delete moment", "error");
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
