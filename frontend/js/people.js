/**
 * People & Sharing Management Module for Shared Trips
 * Metaphor: A quiet list of fellow travelers on the same journey.
 */
const PeopleModal = {
  modal: document.getElementById("modal-people"),
  currentTripId: null,
  tripInfo: null,
  membersData: null,
  invitationsData: [],
  searchTimeout: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Close people modal
    document.getElementById("btn-close-people")?.addEventListener("click", () => this.closeModal());
    document.getElementById("btn-done-people")?.addEventListener("click", () => this.closeModal());

    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // Handle escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modal?.classList.contains("open")) {
        this.closeModal();
      }
    });

    // Leave trip confirmation modal events
    const leaveModal = document.getElementById("modal-confirm-leave-trip");
    document.getElementById("btn-close-confirm-leave")?.addEventListener("click", () => {
      leaveModal?.classList.remove("open");
      App.unlockScroll();
    });
    document.getElementById("btn-cancel-leave-trip")?.addEventListener("click", () => {
      leaveModal?.classList.remove("open");
      App.unlockScroll();
    });
    document.getElementById("btn-confirm-leave-trip")?.addEventListener("click", async () => {
      await this.handleLeaveTrip();
    });
    leaveModal?.addEventListener("click", (e) => {
      if (e.target === leaveModal) {
        leaveModal.classList.remove("open");
        App.unlockScroll();
      }
    });
  },

  async openModal(tripId) {
    this.currentTripId = tripId;
    App.lockScroll();
    this.modal.classList.add("open");
    
    const container = document.getElementById("people-modal-body");
    if (container) {
      container.innerHTML = `<div class="people-loading">Loading travelers...</div>`;
    }

    await this.loadData();
  },

  closeModal() {
    this.modal.classList.remove("open");
    App.unlockScroll();
  },

  async loadData() {
    try {
      const [trip, membersRes] = await Promise.all([
        API.getTrip(this.currentTripId),
        API.getTripMembers(this.currentTripId),
      ]);

      this.tripInfo = trip;
      this.membersData = membersRes;

      if (membersRes.is_creator) {
        try {
          this.invitationsData = await API.getTripInvitations(this.currentTripId);
        } catch (e) {
          this.invitationsData = [];
        }
      } else {
        this.invitationsData = [];
      }

      this.render();
    } catch (err) {
      const container = document.getElementById("people-modal-body");
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <p class="empty-state-text">${this.escapeHtml(err.message || "Could not load people.")}</p>
            <button type="button" class="btn-secondary" onclick="PeopleModal.loadData()">retry</button>
          </div>
        `;
      }
    }
  },

  render() {
    const container = document.getElementById("people-modal-body");
    if (!container) return;

    const isCreator = this.membersData?.is_creator;
    const members = this.membersData?.members || [];
    const tripName = this.tripInfo?.name || "this journey";

    // Guarantee creator is ALWAYS at the top, then fellow travelers
    const sortedMembers = [...members].sort((a, b) => {
      if (a.role === "creator") return -1;
      if (b.role === "creator") return 1;
      return 0;
    });

    let html = `
      <div class="people-header-section">
        <p class="people-intro-note">
          ${isCreator
            ? `Everyone sharing the <em>${this.escapeHtml(tripName)}</em> collection.`
            : `Fellow travelers contributing memories to <em>${this.escapeHtml(tripName)}</em>.`}
        </p>
      </div>

      <!-- Travelers Roster -->
      <div class="people-roster-section">
        <h3 class="people-section-subtitle title-serif">travelers (${sortedMembers.length})</h3>
        <div class="people-list">
    `;

    sortedMembers.forEach((m) => {
      const memberId = m.user_id || m.id;
      const isSelf = m.is_current_user || (App.currentUser && App.currentUser.id === memberId);
      const memberName = m.name || m.username || (m.email ? m.email.split("@")[0] : "Traveler");
      const initial = memberName.charAt(0).toUpperCase();
      const isMemberCreator = m.role === "creator";

      html += `
        <div class="people-card ${isMemberCreator ? "is-creator" : ""}" data-user-id="${memberId}">
          <div class="people-card-header">
            <div class="people-avatar-circle ${isMemberCreator ? "creator-avatar" : ""}">${initial}</div>
            <div class="people-meta">
              <div class="people-name-row">
                <span class="people-name title-serif">${this.escapeHtml(memberName)}</span>
                ${isSelf ? `<span class="people-self-badge">(you)</span>` : ""}
                <span class="people-role-tag font-script ${isMemberCreator ? "role-creator" : "role-traveler"}">${isMemberCreator ? "creator · host" : "traveler"}</span>
              </div>
              <div class="people-email">${this.escapeHtml(m.email)}</div>
            </div>
            ${
              isCreator && !isMemberCreator
                ? `
              <button type="button" class="people-remove-btn" title="Remove traveler" aria-label="Remove traveler" onclick="PeopleModal.handleRemoveMember(${memberId}, '${this.escapeHtml(memberName)}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>remove</span>
              </button>
            `
                : ""
            }
          </div>
      `;

      // Permissions toggles for Creator (on non-creator members)
      if (isCreator && !isMemberCreator) {
        html += `
          <div class="people-permissions-box">
            <span class="permissions-label">permissions</span>
            <div class="permissions-pills-row">
              <label class="permission-pill ${m.can_add_moments ? "is-active" : ""}">
                <input type="checkbox" ${m.can_add_moments ? "checked" : ""} onchange="PeopleModal.handleTogglePermission(${memberId}, 'can_add_moments', this.checked)" />
                <span class="permission-pill-icon">✦</span>
                <span class="permission-pill-text">add memories</span>
              </label>
              <label class="permission-pill ${m.can_edit_moments ? "is-active" : ""}">
                <input type="checkbox" ${m.can_edit_moments ? "checked" : ""} onchange="PeopleModal.handleTogglePermission(${memberId}, 'can_edit_moments', this.checked)" />
                <span class="permission-pill-icon">✎</span>
                <span class="permission-pill-text">edit own</span>
              </label>
              <label class="permission-pill ${m.can_delete_moments ? "is-active" : ""}">
                <input type="checkbox" ${m.can_delete_moments ? "checked" : ""} onchange="PeopleModal.handleTogglePermission(${memberId}, 'can_delete_moments', this.checked)" />
                <span class="permission-pill-icon">✕</span>
                <span class="permission-pill-text">delete own</span>
              </label>
            </div>
          </div>
        `;
      }

      html += `</div>`;
    });

    html += `</div></div>`;

    // Creator-only: Invite section & Invite Link generator & Pending Invites
    if (isCreator) {
      // Find active share link if any
      const activeLinkInvite = this.invitationsData.find(
        (inv) => inv.invite_type === "link" && inv.status === "pending"
      );
      const activeLinkUrl = activeLinkInvite ? `${window.location.origin}/#invite/${activeLinkInvite.token}` : "";

      html += `
        <!-- Invite Travelers Section -->
        <div class="people-invite-section">
          <h3 class="people-section-subtitle title-serif">invite someone</h3>

          <!-- Direct User Search -->
          <div class="invite-search-box">
            <label class="form-label" for="input-people-search">find traveler by email or name</label>
            <div class="search-input-wrapper">
              <input type="text" id="input-people-search" class="form-input paper-input" placeholder="e.g. Maya or maya@example.com" autocomplete="off" />
              <div id="search-spinner" class="search-spinner" style="display: none;"></div>
            </div>
            <div id="search-results-container" class="search-results-list" style="display: none;"></div>
          </div>

          <div class="invite-divider">
            <span class="invite-divider-text">or share an invite link</span>
          </div>

          <!-- Shareable Invite Link -->
          <div class="invite-link-box">
            ${
              activeLinkInvite
                ? `
              <div class="invite-active-link-row">
                <input type="text" readonly class="form-input paper-input invite-link-input" value="${this.escapeHtml(activeLinkUrl)}" id="input-active-invite-link" />
                <button type="button" class="btn-secondary btn-copy-link" onclick="PeopleModal.handleCopyInviteLink('${this.escapeHtml(activeLinkUrl)}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>copy link</span>
                </button>
              </div>
              <div class="invite-link-meta-row">
                <span class="invite-link-hint">Anyone with this link can join as a traveler.</span>
                <button type="button" class="invite-revoke-link-btn" onclick="PeopleModal.handleRevokeInvitation(${activeLinkInvite.id})">
                  disable link
                </button>
              </div>
            `
                : `
              <p class="invite-link-description">Generate a private link to send to friends via messaging or email.</p>
              <button type="button" class="btn-secondary btn-create-link" onclick="PeopleModal.handleCreateInviteLink()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <span>create invite link</span>
              </button>
            `
            }
          </div>

          <!-- Pending Direct Invites List -->
          ${this.renderPendingInvitations()}
        </div>
      `;
    }

    // Member View: Option to leave the trip
    if (!isCreator) {
      html += `
        <div class="people-member-actions">
          <div class="member-rights-note">
            <span class="rights-stamp">traveler member</span>
            <p>You can add moments and edit or delete your own memories on this trip.</p>
          </div>
          <button type="button" class="btn-leave-trip-trigger" onclick="PeopleModal.openLeaveConfirmModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>leave this trip</span>
          </button>
        </div>
      `;
    }

    container.innerHTML = html;

    // Bind dynamic events (search input)
    if (isCreator) {
      const searchInput = document.getElementById("input-people-search");
      searchInput?.addEventListener("input", (e) => {
        const q = e.target.value.trim();
        clearTimeout(this.searchTimeout);
        if (q.length < 2) {
          const resCont = document.getElementById("search-results-container");
          if (resCont) {
            resCont.style.display = "none";
            resCont.innerHTML = "";
          }
          return;
        }
        this.searchTimeout = setTimeout(() => this.performSearch(q), 300);
      });
    }
  },

  renderPendingInvitations() {
    const directPending = this.invitationsData.filter(
      (inv) => inv.invite_type === "direct" && inv.status === "pending"
    );

    if (directPending.length === 0) return "";

    let html = `
      <div class="pending-invites-block">
        <h4 class="pending-invites-title title-serif">pending invitations (${directPending.length})</h4>
        <div class="pending-invites-list">
    `;

    directPending.forEach((inv) => {
      const name = inv.invitee_name || inv.invitee_email || "Invited traveler";
      html += `
        <div class="pending-invite-row">
          <div class="pending-invite-meta">
            <span class="pending-invite-name">${this.escapeHtml(name)}</span>
            <span class="pending-invite-tag font-script">invitation sent</span>
          </div>
          <button type="button" class="pending-revoke-btn" title="Cancel invitation" onclick="PeopleModal.handleRevokeInvitation(${inv.id})">
            revoke
          </button>
        </div>
      `;
    });

    html += `</div></div>`;
    return html;
  },

  async performSearch(query) {
    const spinner = document.getElementById("search-spinner");
    const resultsContainer = document.getElementById("search-results-container");
    if (!resultsContainer) return;

    if (spinner) spinner.style.display = "block";

    const isEmailLike = query.includes("@") && query.includes(".");

    try {
      const users = await API.searchUsers(query, this.currentTripId);
      if (spinner) spinner.style.display = "none";

      let rowsHtml = users
        .map((u) => {
          const name = u.username || u.email.split("@")[0];
          const initial = name.charAt(0).toUpperCase();
          return `
          <div class="search-result-row">
            <div class="search-result-user">
              <div class="search-avatar-circle">${initial}</div>
              <div class="search-user-meta">
                <span class="search-user-name">${this.escapeHtml(name)}</span>
                <span class="search-user-email">${this.escapeHtml(u.email)}</span>
              </div>
            </div>
            <button type="button" class="btn-secondary btn-send-invite" onclick="PeopleModal.handleSendDirectInvite(${u.id}, '${this.escapeHtml(name)}', '${this.escapeHtml(u.email)}')">
              <span>invite</span>
            </button>
          </div>
        `;
        })
        .join("");

      // If user typed an email address not already in the search results
      if (isEmailLike && !users.some((u) => u.email.toLowerCase() === query.toLowerCase())) {
        rowsHtml += `
          <div class="search-result-row is-email-invite-row">
            <div class="search-result-user">
              <div class="search-avatar-circle">@</div>
              <div class="search-user-meta">
                <span class="search-user-name">Invite via email</span>
                <span class="search-user-email">${this.escapeHtml(query)}</span>
              </div>
            </div>
            <button type="button" class="btn-primary btn-send-invite" onclick="PeopleModal.handleSendEmailInvite('${this.escapeHtml(query)}')">
              <span>send email</span>
            </button>
          </div>
        `;
      }

      if (!rowsHtml) {
        resultsContainer.innerHTML = `<div class="search-empty">No matching travelers found. Type an email to send an invite.</div>`;
      } else {
        resultsContainer.innerHTML = rowsHtml;
      }

      resultsContainer.style.display = "block";
    } catch (err) {
      if (spinner) spinner.style.display = "none";
      resultsContainer.innerHTML = `<div class="search-empty">${this.escapeHtml(err.message || "Search failed.")}</div>`;
      resultsContainer.style.display = "block";
    }
  },

  async handleSendDirectInvite(userId, userName, userEmail) {
    try {
      const res = await API.createInvitation(this.currentTripId, {
        type: "direct",
        invitee_id: userId,
        email: userEmail || null,
      });

      const emailNote = res?.email_sent ? " (invitation email sent)" : "";
      App.showToast(`Invitation sent to ${userName}${emailNote}`);

      const searchInput = document.getElementById("input-people-search");
      if (searchInput) searchInput.value = "";
      const resultsContainer = document.getElementById("search-results-container");
      if (resultsContainer) {
        resultsContainer.style.display = "none";
        resultsContainer.innerHTML = "";
      }
      await this.loadData();
    } catch (err) {
      App.showToast(err.message || "Could not send invitation", "error");
    }
  },

  async handleSendEmailInvite(email) {
    try {
      const res = await API.createInvitation(this.currentTripId, {
        type: "email",
        email: email,
      });

      const emailNote = res?.email_sent ? "Invitation email sent!" : "Invitation link created for email.";
      App.showToast(emailNote);

      const searchInput = document.getElementById("input-people-search");
      if (searchInput) searchInput.value = "";
      const resultsContainer = document.getElementById("search-results-container");
      if (resultsContainer) {
        resultsContainer.style.display = "none";
        resultsContainer.innerHTML = "";
      }
      await this.loadData();
    } catch (err) {
      App.showToast(err.message || "Could not send email invitation", "error");
    }
  },

  async handleCreateInviteLink() {
    try {
      await API.createInvitation(this.currentTripId, {
        type: "link",
      });
      App.showToast("Invite link created!");
      await this.loadData();
    } catch (err) {
      App.showToast(err.message || "Could not create invite link", "error");
    }
  },

  handleCopyInviteLink(url) {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        App.showToast("Invite link copied to clipboard!");
      })
      .catch(() => {
        // Fallback
        const input = document.getElementById("input-active-invite-link");
        if (input) {
          input.select();
          document.execCommand("copy");
          App.showToast("Invite link copied!");
        }
      });
  },

  async handleRevokeInvitation(invitationId) {
    try {
      await API.revokeInvitation(this.currentTripId, invitationId);
      App.showToast("Invitation cancelled.");
      await this.loadData();
    } catch (err) {
      App.showToast(err.message || "Could not revoke invitation", "error");
    }
  },

  async handleTogglePermission(userId, permKey, value) {
    try {
      // Optimistic visual pill update
      const card = document.querySelector(`.people-card[data-user-id="${userId}"]`);
      if (card) {
        const input = card.querySelector(`input[onchange*="${permKey}"]`);
        const pill = input ? input.closest(".permission-pill") : null;
        if (pill) {
          pill.classList.toggle("is-active", value);
        }
      }

      await API.updateMemberPermissions(this.currentTripId, userId, {
        [permKey]: value,
      });
      App.showToast("Permissions updated.");
      // Update local cache
      const member = this.membersData?.members?.find((m) => (m.user_id === userId || m.id === userId));
      if (member) member[permKey] = value;
    } catch (err) {
      App.showToast(err.message || "Could not update permissions", "error");
      await this.loadData();
    }
  },

  async handleRemoveMember(userId, memberName) {
    const confirmed = await App.confirm({
      title: "remove traveler",
      message: `Remove ${memberName} from this trip? Their past memories and notes will remain in the collection.`,
      confirmText: "yes, remove traveler",
      cancelText: "keep traveler",
      isDanger: true,
      warning: "They will no longer be able to view or contribute new moments to this trip.",
    });

    if (!confirmed) {
      return;
    }

    try {
      await API.removeTripMember(this.currentTripId, userId);
      App.showToast(`${memberName} was removed from the trip.`);
      await this.loadData();
    } catch (err) {
      App.showToast(err.message || "Could not remove member", "error");
    }
  },

  openLeaveConfirmModal() {
    const leaveModal = document.getElementById("modal-confirm-leave-trip");
    if (leaveModal) {
      App.lockScroll();
      leaveModal.classList.add("open");
    }
  },

  async handleLeaveTrip() {
    try {
      await API.leaveTrip(this.currentTripId);
      const leaveModal = document.getElementById("modal-confirm-leave-trip");
      if (leaveModal) leaveModal.classList.remove("open");
      this.closeModal();
      App.showToast("You left the trip.");
      App.navigateToTrips();
    } catch (err) {
      App.showToast(err.message || "Could not leave trip", "error");
    }
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
};

window.PeopleModal = PeopleModal;
