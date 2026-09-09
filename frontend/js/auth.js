/**
 * Authentication Module & Traveler Management
 * Handles Sign In / Create Account Page (#view-auth), Modal, and Traveler Session Management.
 */
const AuthModal = {
  // Modal Elements
  modal: document.getElementById("modal-auth"),
  form: document.getElementById("form-auth"),
  modalMode: "login", // 'login' or 'register'
  emailInput: document.getElementById("input-auth-email"),
  passwordInput: document.getElementById("input-auth-password"),
  usernameInput: document.getElementById("input-auth-username"),
  usernameGroup: document.getElementById("group-auth-username"),
  tabLogin: document.getElementById("tab-auth-login"),
  tabRegister: document.getElementById("tab-auth-register"),
  submitBtn: document.getElementById("btn-submit-auth"),
  errorMsg: document.getElementById("auth-error-msg"),
  modalTitle: document.getElementById("auth-modal-title"),

  // Dedicated Auth Page Elements
  pageMode: "login",
  pageAuthCard: document.getElementById("auth-page-authenticated-card"),
  pageFormCard: document.getElementById("auth-page-form-card"),
  pageForm: document.getElementById("form-auth-page"),
  pageTabLogin: document.getElementById("tab-auth-page-login"),
  pageTabRegister: document.getElementById("tab-auth-page-register"),
  pageUsernameGroup: document.getElementById("group-auth-page-username"),
  pageUsernameInput: document.getElementById("input-auth-page-username"),
  pageEmailInput: document.getElementById("input-auth-page-email"),
  pagePasswordInput: document.getElementById("input-auth-page-password"),
  pageSubmitBtn: document.getElementById("btn-submit-auth-page"),
  pageErrorMsg: document.getElementById("auth-page-error-msg"),
  pageTitle: document.getElementById("auth-page-title"),
  pageSubtitle: document.getElementById("auth-page-subtitle"),

  init() {
    this.bindEvents();
    this.updateAuthPageState();
  },

  bindEvents() {
    // 1. Modal Close / Backdrop
    document.getElementById("btn-close-auth")?.addEventListener("click", () => this.closeModal());
    document.getElementById("btn-cancel-auth")?.addEventListener("click", () => this.closeModal());
    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // 2. Modal Tabs
    this.tabLogin?.addEventListener("click", () => this.setModalMode("login"));
    this.tabRegister?.addEventListener("click", () => this.setModalMode("register"));

    // 3. Modal Form Submit
    this.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleModalSubmit();
    });

    // 4. Auth Page Tabs
    this.pageTabLogin?.addEventListener("click", () => this.setPageMode("login"));
    this.pageTabRegister?.addEventListener("click", () => this.setPageMode("register"));

    // 5. Auth Page Form Submit
    this.pageForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handlePageSubmit();
    });

    // 6. Auth Page Logout Button
    document.getElementById("btn-auth-page-logout")?.addEventListener("click", () => {
      this.logout();
    });

    // 7. Auth Page Delete Account Button
    document.getElementById("btn-auth-page-delete-account")?.addEventListener("click", () => {
      this.deleteAccount();
    });
  },

  setModalMode(mode) {
    this.modalMode = mode;
    this.clearError();

    if (mode === "login") {
      this.tabLogin?.classList.add("active");
      this.tabRegister?.classList.remove("active");
      if (this.usernameGroup) this.usernameGroup.style.display = "none";
      if (this.modalTitle) this.modalTitle.textContent = "open your travel desk";
      if (this.submitBtn) this.submitBtn.innerHTML = "<span>sign in</span>";
    } else {
      this.tabLogin?.classList.remove("active");
      this.tabRegister?.classList.add("active");
      if (this.usernameGroup) this.usernameGroup.style.display = "block";
      if (this.modalTitle) this.modalTitle.textContent = "create an account";
      if (this.submitBtn) this.submitBtn.innerHTML = "<span>create account</span>";
    }
  },

  setPageMode(mode) {
    this.pageMode = mode;
    this.clearPageError();

    if (mode === "login") {
      this.pageTabLogin?.classList.add("active");
      this.pageTabRegister?.classList.remove("active");
      if (this.pageUsernameGroup) this.pageUsernameGroup.style.display = "none";
      if (this.pageTitle) this.pageTitle.textContent = "open your travel desk";
      if (this.pageSubtitle) this.pageSubtitle.textContent = "Sign in to save and access your personal journey archive.";
      if (this.pageSubmitBtn) this.pageSubmitBtn.innerHTML = "<span>sign in</span>";
    } else {
      this.pageTabLogin?.classList.remove("active");
      this.pageTabRegister?.classList.add("active");
      if (this.pageUsernameGroup) this.pageUsernameGroup.style.display = "block";
      if (this.pageTitle) this.pageTitle.textContent = "create an account";
      if (this.pageSubtitle) this.pageSubtitle.textContent = "Create an account to keep your personal journey archive.";
      if (this.pageSubmitBtn) this.pageSubmitBtn.innerHTML = "<span>create account</span>";
    }
  },

  updateAuthPageState() {
    const user = App.currentUser;
    const authCard = document.getElementById("auth-page-authenticated-card");
    const formCard = document.getElementById("auth-page-form-card");

    if (user) {
      if (authCard) authCard.style.display = "block";
      if (formCard) formCard.style.display = "none";

      const name = user.username || user.email.split("@")[0];
      const initial = name.charAt(0).toUpperCase();

      const avatarEl = document.getElementById("auth-page-user-avatar");
      const nameEl = document.getElementById("auth-page-user-name");
      const emailEl = document.getElementById("auth-page-user-email");

      if (avatarEl) avatarEl.textContent = initial;
      if (nameEl) nameEl.textContent = name;
      if (emailEl) emailEl.textContent = user.email;
    } else {
      if (authCard) authCard.style.display = "none";
      if (formCard) formCard.style.display = "block";
    }
  },

  openModal(defaultMode = "login") {
    this.form?.reset();
    this.clearError();
    this.setModalMode(defaultMode);
    this.modal?.classList.add("open");
    setTimeout(() => this.emailInput?.focus(), 150);
  },

  closeModal() {
    this.modal?.classList.remove("open");
    this.form?.reset();
    this.clearError();
  },

  showError(msg) {
    if (this.errorMsg) {
      this.errorMsg.textContent = msg;
      this.errorMsg.style.display = "block";
    }
  },

  clearError() {
    if (this.errorMsg) {
      this.errorMsg.textContent = "";
      this.errorMsg.style.display = "none";
    }
  },

  showPageError(msg) {
    if (this.pageErrorMsg) {
      this.pageErrorMsg.textContent = msg;
      this.pageErrorMsg.style.display = "block";
    }
  },

  clearPageError() {
    if (this.pageErrorMsg) {
      this.pageErrorMsg.textContent = "";
      this.pageErrorMsg.style.display = "none";
    }
  },

  async handleModalSubmit() {
    const email = this.emailInput?.value.trim();
    const password = this.passwordInput?.value;
    const username = this.usernameInput ? this.usernameInput.value.trim() : null;

    if (!email || !password) {
      this.showError("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      this.showError("Password must be at least 6 characters.");
      return;
    }

    this.clearError();
    if (this.submitBtn) {
      this.submitBtn.disabled = true;
      this.submitBtn.innerHTML = "<span>connecting...</span>";
    }

    const remember = document.getElementById("checkbox-auth-remember")?.checked ?? true;

    try {
      let res;
      if (this.modalMode === "login") {
        res = await API.login(email, password, remember);
      } else {
        res = await API.register(email, password, username, remember);
      }

      App.currentUser = res.user;
      App.updateUserHeader();

      const displayName = res.user.username || res.user.email.split("@")[0];
      App.showToast(this.modalMode === "login" ? `Welcome back, ${displayName}!` : `Welcome, ${displayName}!`);

      this.closeModal();

      // Refresh current view with user-scoped data
      if (App.currentView === "trips") {
        TripsView.loadTrips();
      } else if (App.currentView === "auth") {
        App.navigateToTrips();
      } else if (App.activeTripId) {
        MomentsView.loadTimeline(App.activeTripId);
      }
    } catch (err) {
      this.showError(err.message || "Authentication failed. Please check your details.");
    } finally {
      if (this.submitBtn) {
        this.submitBtn.disabled = false;
        this.submitBtn.innerHTML = this.modalMode === "login" ? "<span>sign in</span>" : "<span>create account</span>";
      }
    }
  },

  async handlePageSubmit() {
    const email = this.pageEmailInput?.value.trim();
    const password = this.pagePasswordInput?.value;
    const username = this.pageUsernameInput ? this.pageUsernameInput.value.trim() : null;

    if (!email || !password) {
      this.showPageError("Please enter your email and password.");
      return;
    }

    if (password.length < 6) {
      this.showPageError("Password must be at least 6 characters.");
      return;
    }

    this.clearPageError();
    if (this.pageSubmitBtn) {
      this.pageSubmitBtn.disabled = true;
      this.pageSubmitBtn.innerHTML = "<span>connecting...</span>";
    }

    const remember = document.getElementById("checkbox-auth-page-remember")?.checked ?? true;

    try {
      let res;
      if (this.pageMode === "login") {
        res = await API.login(email, password, remember);
      } else {
        res = await API.register(email, password, username, remember);
      }

      App.currentUser = res.user;
      App.updateUserHeader();

      const displayName = res.user.username || res.user.email.split("@")[0];
      App.showToast(this.pageMode === "login" ? `Welcome back, ${displayName}!` : `Welcome, ${displayName}!`);

      App.navigateToTrips();
    } catch (err) {
      this.showPageError(err.message || "Authentication failed. Please check your details.");
    } finally {
      if (this.pageSubmitBtn) {
        this.pageSubmitBtn.disabled = false;
        this.pageSubmitBtn.innerHTML = this.pageMode === "login" ? "<span>sign in</span>" : "<span>create account</span>";
      }
    }
  },

  logout() {
    API.logout();
    App.currentUser = null;
    App.updateUserHeader();
    this.setPageMode("login");
    this.pageForm?.reset();
    this.clearPageError();
    App.showToast("Signed out.");

    // Always redirect user to the sign in page
    App.navigateToAuth();
  },

  async deleteAccount() {
    const confirmed = confirm("Are you sure you want to permanently delete your traveler account?\n\nAll your trips, postcards, and footnotes will be permanently deleted. This action cannot be undone.");
    if (!confirmed) return;

    try {
      await API.deleteAccount();
      App.currentUser = null;
      App.updateUserHeader();
      this.setPageMode("login");
      this.pageForm?.reset();
      this.clearPageError();
      App.showToast("Your account has been deleted.");
      App.navigateToAuth();
    } catch (err) {
      App.showToast(err.message || "Failed to delete account.", "error");
    }
  },
};

window.AuthModal = AuthModal;
