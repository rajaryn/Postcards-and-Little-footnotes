/**
 * Invitation Preview & Acceptance Controller for Shared Trips
 * Includes In-App Notifications & Banner for Invited Travelers
 */
const InvitationController = {
  modal: document.getElementById("modal-invitation"),
  currentToken: null,
  invitationData: null,
  pendingInvitations: [],
  notifiedTokens: new Set(),
  pollInterval: null,

  init() {
    this.bindEvents();
    this.startPolling();
  },

  bindEvents() {
    document.getElementById("btn-close-invitation")?.addEventListener("click", () => this.closeModal());
    document.getElementById("btn-decline-invitation")?.addEventListener("click", () => this.handleDecline());
    document.getElementById("btn-accept-invitation")?.addEventListener("click", () => this.handleAccept());
    document.getElementById("btn-invitation-signin")?.addEventListener("click", () => {
      this.closeModal();
      // Store token so post-login returns to it
      if (this.currentToken) {
        sessionStorage.setItem("pending_invite_token", this.currentToken);
      }
      App.navigateToAuth();
    });

    // Notification bell button in navbar
    document.getElementById("btn-header-notifications")?.addEventListener("click", () => {
      if (this.pendingInvitations.length === 1) {
        this.openPreview(this.pendingInvitations[0].token);
      } else if (this.pendingInvitations.length > 1) {
        App.navigateToTrips();
        const banner = document.getElementById("pending-invitations-banner-container");
        if (banner) {
          banner.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    });

    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // Handle escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal?.classList.contains("open")) {
        this.closeModal();
      }
    });
  },

  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    // Quietly check pending invitations every 45s when user is logged in
    this.pollInterval = setInterval(() => {
      if (App.currentUser && document.visibilityState === "visible") {
        this.checkPendingInvitations(false);
      }
    }, 45000);
  },

  async checkPendingInvitations(silent = false) {
    if (!App.currentUser) {
      this.pendingInvitations = [];
      this.updateBadge(0);
      this.renderPendingBanner([]);
      return [];
    }

    try {
      const invitations = await API.getPendingInvitations();
      this.pendingInvitations = invitations || [];
      this.updateBadge(this.pendingInvitations.length);
      this.renderPendingBanner(this.pendingInvitations);

      // Notify user via toast for newly detected invitations
      this.pendingInvitations.forEach((inv) => {
        if (!this.notifiedTokens.has(inv.token)) {
          this.notifiedTokens.add(inv.token);
          if (!silent) {
            const inviter = inv.inviter_name || "A fellow traveler";
            App.showToast(`✉️ ${inviter} invited you to join "${inv.trip_name}"`);
          }
        }
      });

      return this.pendingInvitations;
    } catch (e) {
      return [];
    }
  },

  updateBadge(count) {
    const btn = document.getElementById("btn-header-notifications");
    const badge = document.getElementById("header-notification-badge");
    if (!btn || !badge) return;

    if (count > 0) {
      btn.style.display = "inline-flex";
      badge.textContent = count > 9 ? "9+" : count;
      badge.style.display = "inline-flex";
    } else {
      btn.style.display = "none";
      badge.style.display = "none";
    }
  },

  renderPendingBanner(invitations) {
    const container = document.getElementById("pending-invitations-banner-container");
    if (!container) return;

    if (!invitations || invitations.length === 0) {
      container.style.display = "none";
      container.innerHTML = "";
      return;
    }

    let html = `
      <div class="pending-invitations-banner">
        <div class="pending-banner-header">
          <span class="pending-banner-title title-serif">journey invitations (${invitations.length})</span>
          <span class="pending-banner-subtitle">Fellow travelers waiting for you</span>
        </div>
        <div class="pending-banner-list">
    `;

    invitations.forEach((inv) => {
      const inviter = inv.inviter_name || "A traveler";
      const datesStr = TripsView.formatTripDates(inv.start_date, inv.end_date, null);

      html += `
        <div class="pending-banner-card" data-token="${this.escapeHtml(inv.token)}">
          <div class="pending-card-main">
            <div class="pending-card-stamp font-script">invitation</div>
            <div class="pending-card-text">
              <strong>${this.escapeHtml(inviter)}</strong> invited you to join <em>${this.escapeHtml(inv.trip_name)}</em>
            </div>
            ${datesStr ? `<div class="pending-card-dates">${this.escapeHtml(datesStr)}</div>` : ""}
          </div>
          <div class="pending-card-actions">
            <button type="button" class="btn-primary btn-accept-pill" onclick="InvitationController.handleQuickAccept('${this.escapeHtml(inv.token)}')">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>join journey</span>
            </button>
            <button type="button" class="btn-secondary btn-review-pill" onclick="InvitationController.openPreview('${this.escapeHtml(inv.token)}')">
              <span>review</span>
            </button>
            <button type="button" class="btn-decline-pill" title="Decline invitation" onclick="InvitationController.handleQuickDecline('${this.escapeHtml(inv.token)}')">
              <span>decline</span>
            </button>
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
    container.style.display = "block";
  },

  async openPreview(token) {
    this.currentToken = token;
    App.lockScroll();
    this.modal.classList.add("open");

    const content = document.getElementById("invitation-modal-body");
    if (content) {
      content.innerHTML = `<div class="invitation-loading">Opening invitation...</div>`;
    }

    try {
      const data = await API.previewInvitation(token);
      this.invitationData = data;
      this.render();
    } catch (err) {
      if (content) {
        content.innerHTML = `
          <div class="empty-state">
            <h2 class="empty-state-title title-serif">Invitation Unavailable</h2>
            <p class="empty-state-text">${this.escapeHtml(err.message || "This invitation link is invalid or has expired.")}</p>
            <button type="button" class="btn-primary" onclick="InvitationController.closeModal(); App.navigateToTrips();">go to journeys</button>
          </div>
        `;
      }
    }
  },

  closeModal() {
    this.modal.classList.remove("open");
    App.unlockScroll();
  },

  render() {
    const content = document.getElementById("invitation-modal-body");
    if (!content || !this.invitationData) return;

    const data = this.invitationData;
    const inviter = data.inviter_username || (data.inviter_email ? data.inviter_email.split("@")[0] : "A traveler");
    const datesStr = TripsView.formatTripDates(data.start_date, data.end_date, null);
    const isLoggedIn = !!App.currentUser;

    content.innerHTML = `
      <div class="invitation-card-paper">
        <div class="invitation-stamp-tag font-script">journey invitation</div>

        <div class="invitation-main-content">
          <h2 class="invitation-trip-title title-serif">${this.escapeHtml(data.trip_name)}</h2>
          ${datesStr ? `<div class="invitation-trip-dates">${datesStr}</div>` : ""}

          <p class="invitation-message">
            <strong>${this.escapeHtml(inviter)}</strong> invited you to share memories from this journey.
          </p>

          <p class="invitation-description">
            You'll be able to view all postcards and little footnotes, and contribute your own memories to the collection.
          </p>
        </div>

        <div class="invitation-actions">
          ${
            isLoggedIn
              ? `
            <button type="button" id="btn-accept-invitation" class="btn-primary invitation-btn-accept">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>join this trip</span>
            </button>
            <button type="button" id="btn-decline-invitation" class="btn-secondary invitation-btn-decline">
              <span>decline</span>
            </button>
          `
              : `
            <button type="button" id="btn-invitation-signin" class="btn-primary invitation-btn-signin">
              <span>sign in to join this trip &rarr;</span>
            </button>
          `
          }
        </div>
      </div>
    `;

    // Re-bind actions
    document.getElementById("btn-accept-invitation")?.addEventListener("click", () => this.handleAccept());
    document.getElementById("btn-decline-invitation")?.addEventListener("click", () => this.handleDecline());
    document.getElementById("btn-invitation-signin")?.addEventListener("click", () => {
      this.closeModal();
      if (this.currentToken) {
        sessionStorage.setItem("pending_invite_token", this.currentToken);
      }
      App.navigateToAuth();
    });
  },

  async handleAccept() {
    if (!this.currentToken) return;

    try {
      const res = await API.acceptInvitation(this.currentToken);
      this.closeModal();
      sessionStorage.removeItem("pending_invite_token");
      App.showToast(`Joined "${res.trip_name || "trip"}"!`);
      await this.checkPendingInvitations(true);
      App.navigateToTimeline(res.trip_id);
    } catch (err) {
      App.showToast(err.message || "Could not accept invitation", "error");
    }
  },

  async handleDecline() {
    if (!this.currentToken) return;

    try {
      await API.declineInvitation(this.currentToken);
      this.closeModal();
      sessionStorage.removeItem("pending_invite_token");
      App.showToast("Invitation declined.");
      await this.checkPendingInvitations(true);
      App.navigateToTrips();
    } catch (err) {
      App.showToast(err.message || "Could not decline invitation", "error");
    }
  },

  async handleQuickAccept(token) {
    if (!token) return;
    try {
      const res = await API.acceptInvitation(token);
      App.showToast(`Joined "${res.trip_name || "trip"}"!`);
      await this.checkPendingInvitations(true);
      App.navigateToTimeline(res.trip_id);
    } catch (err) {
      App.showToast(err.message || "Could not accept invitation", "error");
    }
  },

  async handleQuickDecline(token) {
    if (!token) return;
    try {
      await API.declineInvitation(token);
      App.showToast("Invitation declined.");
      await this.checkPendingInvitations(true);
      await TripsView.loadTrips();
    } catch (err) {
      App.showToast(err.message || "Could not decline invitation", "error");
    }
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
};

window.InvitationController = InvitationController;
