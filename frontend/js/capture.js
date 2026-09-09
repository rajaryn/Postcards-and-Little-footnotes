/**
 * Fast Capture Modal Module with Direct R2 Upload & Custom Date/Time
 */
const CaptureModal = {
  modal: document.getElementById("modal-capture"),
  form: document.getElementById("form-capture"),
  photoInput: document.getElementById("input-moment-photo"),
  captionInput: document.getElementById("input-moment-caption"),
  datetimeInput: document.getElementById("input-moment-datetime"),
  uploadZone: document.getElementById("photo-upload-zone"),
  uploadPrompt: document.getElementById("photo-upload-prompt"),
  previewWrapper: document.getElementById("photo-preview-wrapper"),
  previewImg: document.getElementById("photo-preview-img"),
  removePhotoBtn: document.getElementById("btn-remove-photo"),
  submitBtn: document.getElementById("btn-submit-capture"),
  
  currentTripId: null,
  selectedFile: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Open capture from floating button
    document.getElementById("btn-open-capture")?.addEventListener("click", () => {
      if (MomentsView.currentTripId) {
        this.openModal(MomentsView.currentTripId);
      }
    });

    // Close capture modal
    document.getElementById("btn-close-capture")?.addEventListener("click", () => this.closeModal());
    document.getElementById("btn-cancel-capture")?.addEventListener("click", () => this.closeModal());

    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // Image Upload Zone click
    this.uploadZone?.addEventListener("click", (e) => {
      if (e.target !== this.removePhotoBtn && !this.selectedFile) {
        this.photoInput.click();
      }
    });

    // Photo input change
    this.photoInput?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handlePhotoSelected(file);
      }
    });

    // Remove selected photo
    this.removePhotoBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.clearPhoto();
    });

    // Datetime helper buttons
    document.getElementById("btn-datetime-now")?.addEventListener("click", () => {
      if (this.datetimeInput) {
        this.datetimeInput.value = this.getLiveLocalDateTime();
      }
    });

    document.getElementById("btn-datetime-clear")?.addEventListener("click", () => {
      if (this.datetimeInput) {
        this.datetimeInput.value = "";
      }
    });

    // Form submit
    this.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });
  },

  getLiveLocalDateTime() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  },

  openModal(tripId) {
    this.currentTripId = tripId;
    this.resetForm();
    this.modal.classList.add("open");
    // Focus caption for quick typing
    setTimeout(() => this.captionInput.focus(), 150);
  },

  closeModal() {
    this.modal.classList.remove("open");
    this.resetForm();
  },

  handlePhotoSelected(file) {
    this.selectedFile = file;
    console.log(`📸 [Capture UI] Photo selected: "${file.name}" (${(file.size / 1024).toFixed(1)} KB, type: ${file.type})`);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewImg.src = e.target.result;
      this.uploadPrompt.style.display = "none";
      this.previewWrapper.style.display = "block";
      this.uploadZone.classList.add("has-preview");
    };
    reader.readAsDataURL(file);
  },

  clearPhoto() {
    console.log("🗑️ [Capture UI] Selected photo cleared.");
    this.selectedFile = null;
    this.photoInput.value = "";
    this.previewImg.src = "";
    this.uploadPrompt.style.display = "block";
    this.previewWrapper.style.display = "none";
    this.uploadZone.classList.remove("has-preview");
  },

  resetForm() {
    this.form.reset();
    this.clearPhoto();
    if (this.datetimeInput) {
      this.datetimeInput.value = this.getLiveLocalDateTime();
    }
    this.setSubmitting(false);
  },

  setSubmitting(isSubmitting, label = "save to memory") {
    if (this.submitBtn) {
      this.submitBtn.disabled = isSubmitting;
      this.submitBtn.innerHTML = `<span>${label}</span>`;
    }
  },

  async handleSubmit() {
    const caption = this.captionInput.value.trim();
    const hasPhoto = !!this.selectedFile;
    const createdAt = this.datetimeInput ? this.datetimeInput.value : null;

    if (!hasPhoto && !caption) {
      App.showToast("Please add a photo or write something.", "error");
      return;
    }

    console.log(`🚀 [Capture UI] Submitting moment for trip ID ${this.currentTripId}... (hasPhoto=${hasPhoto}, caption="${caption}", datetime="${createdAt}")`);

    try {
      let photoKey = null;

      // Step 1: If photo attached, upload photo (direct to R2 or seamless server fallback)
      if (hasPhoto) {
        this.setSubmitting(true, "saving photo...");
        photoKey = await API.uploadPhoto(this.currentTripId, this.selectedFile);
      }

      // Step 2: Create moment in TiDB with photo_key + caption + custom/live datetime
      this.setSubmitting(true, "placing on desk...");
      const createdMoment = await API.createMoment(this.currentTripId, {
        caption: caption || null,
        photo_key: photoKey,
        created_at: createdAt || null,
      });

      console.log(`🎉 [Capture UI] Full moment creation flow complete! Moment ID: ${createdMoment.id}, created_at: ${createdMoment.created_at}`);

      this.closeModal();
      // Reload timeline immediately so the memory quietly appears
      await MomentsView.loadTimeline(this.currentTripId);
    } catch (err) {
      console.error("❌ [Capture UI] Error during moment capture flow:", err);
      App.showToast(err.message || "Couldn't save that memory. Try again.", "error");
      this.setSubmitting(false);
    }
  },
};

window.CaptureModal = CaptureModal;
