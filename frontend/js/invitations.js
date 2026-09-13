/**
 * Invitation Preview & Acceptance Controller for Shared Trips
 */
const InvitationController = {
  modal: document.getElementById("modal-invitation"),
  currentToken: null,
  invitationData: null,

  init() {
    this.bindEvents();
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

    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) this.closeModal();
    });
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
      App.navigateToTrips();
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
