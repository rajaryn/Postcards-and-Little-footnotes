/**
 * Fast Capture Modal Module with Direct R2 Upload & Custom Date/Time
 * Minimalist & Mobile-Optimized with Swipe-to-Dismiss
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
    this.bindDragAndDrop();
    this.bindSwipeToDismiss();
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
      if (
        e.target !== this.removePhotoBtn &&
        !this.removePhotoBtn?.contains(e.target) &&
        !this.selectedFile
      ) {
        this.photoInput?.click();
      }
    });

    // Photo input change (triggers native mobile picker: camera / library)
    this.photoInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) {
        this.handlePhotoSelected(file);
      }
    });

    // Remove selected photo
    this.removePhotoBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.clearPhoto();
    });

    // Auto-expanding footnote caption textarea
    this.captionInput?.addEventListener("input", () => {
      this.autoResizeCaption();
    });

    // Datetime helper buttons (now & clear)
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

  bindDragAndDrop() {
    if (!this.uploadZone) return;

    const highlight = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadZone.classList.add("drag-over");
    };

    const unhighlight = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadZone.classList.remove("drag-over");
    };

    ["dragenter", "dragover"].forEach((evt) => {
      this.uploadZone.addEventListener(evt, highlight, false);
    });

    ["dragleave", "dragend"].forEach((evt) => {
      this.uploadZone.addEventListener(evt, unhighlight, false);
    });

    this.uploadZone.addEventListener("drop", (e) => {
      unhighlight(e);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        this.handlePhotoSelected(file);
      }
    });

    // Also handle dropping on modal content area
    const modalContent = this.modal?.querySelector(".modal-content");
    if (modalContent) {
      modalContent.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      modalContent.addEventListener("drop", (e) => {
        if (!this.uploadZone.contains(e.target)) {
          e.preventDefault();
          const file = e.dataTransfer?.files?.[0];
          if (file) {
            this.handlePhotoSelected(file);
          }
        }
      });
    }
  },

  bindSwipeToDismiss() {
    const content = this.modal?.querySelector(".modal-content");
    const handle = document.getElementById("capture-drag-handle");
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

  isHeicFile(file) {
    if (!file) return false;
    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    return (
      name.endsWith(".heic") ||
      name.endsWith(".heif") ||
      type === "image/heic" ||
      type === "image/heif" ||
      type === "image/heic-sequence" ||
      type === "image/heif-sequence"
    );
  },

  async loadHeicConverter() {
    if (typeof window.heic2any === "function") {
      return window.heic2any;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/js/heic2any.min.js";
      script.onload = () => {
        if (typeof window.heic2any === "function") {
          resolve(window.heic2any);
        } else {
          reject(new Error("heic2any failed to initialize"));
        }
      };
      script.onerror = () => {
        // Fallback to CDN
        const cdnScript = document.createElement("script");
        cdnScript.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
        cdnScript.onload = () => {
          if (typeof window.heic2any === "function") {
            resolve(window.heic2any);
          } else {
            reject(new Error("CDN heic2any failed"));
          }
        };
        cdnScript.onerror = () => reject(new Error("Could not load HEIC converter"));
        document.head.appendChild(cdnScript);
      };
      document.head.appendChild(script);
    });
  },

  showConvertingNotice(msg) {
    if (!this.uploadPrompt) return;
    this.uploadPrompt.innerHTML = `
      <div class="photo-converting-notice">
        <div class="photo-converting-spinner"></div>
        <span>${this.escapeHtml(msg || "developing photograph...")}</span>
      </div>
    `;
    this.uploadPrompt.style.display = "inline-flex";
    if (this.previewWrapper) this.previewWrapper.style.display = "none";
    if (this.uploadZone) this.uploadZone.classList.remove("has-preview");
  },

  hideConvertingNotice() {
    if (!this.uploadPrompt) return;
    this.uploadPrompt.innerHTML = `
      <svg class="photo-picker-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
      <span class="upload-prompt-text">add photograph <span class="upload-prompt-opt">(optional)</span></span>
    `;
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  async handlePhotoSelected(file) {
    if (!file) return;

    if (this.isHeicFile(file)) {
      console.log(`📸 [Capture UI] Developing HEIC photo: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)...`);
      this.showConvertingNotice("developing photograph...");
      try {
        const heic2any = await this.loadHeicConverter();
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.92,
        });
        const blobResult = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        const jpegFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
        const convertedFile = new File([blobResult], jpegFileName, { type: "image/jpeg" });
        console.log(`✨ [Capture UI] Photograph developed successfully: "${convertedFile.name}" (${(convertedFile.size / 1024).toFixed(1)} KB)`);
        this.hideConvertingNotice();
        this.displayPhotoPreview(convertedFile);
      } catch (err) {
        console.error("❌ [Capture UI] Could not develop photograph:", err);
        this.hideConvertingNotice();
        App.showToast("Could not develop this photograph. Try another picture.", "error");
        this.clearPhoto();
      }
      return;
    }

    this.displayPhotoPreview(file);
  },

  displayPhotoPreview(file) {
    this.selectedFile = file;
    console.log(`📸 [Capture UI] Photo ready: "${file.name}" (${(file.size / 1024).toFixed(1)} KB, type: ${file.type})`);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (this.previewImg) this.previewImg.src = e.target.result;
      if (this.uploadPrompt) this.uploadPrompt.style.display = "none";
      if (this.previewWrapper) this.previewWrapper.style.display = "block";
      if (this.uploadZone) this.uploadZone.classList.add("has-preview");
    };
    reader.readAsDataURL(file);
  },

  autoResizeCaption() {
    if (!this.captionInput) return;
    this.captionInput.style.height = "auto";
    const newHeight = Math.min(Math.max(this.captionInput.scrollHeight, 84), 160);
    this.captionInput.style.height = newHeight + "px";
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
    App.lockScroll();
    this.modal.classList.add("open");
    
    // Only autofocus on non-touch desktop to prevent sudden virtual keyboard popups on mobile
    if (window.matchMedia("(pointer: fine)").matches) {
      setTimeout(() => this.captionInput?.focus(), 150);
    }
  },

  closeModal() {
    const content = this.modal?.querySelector(".modal-content");
    if (content) {
      content.style.transform = "";
      content.style.transition = "";
    }
    this.modal.classList.remove("open");
    App.unlockScroll();
    this.resetForm();
  },

  clearPhoto() {
    console.log("🗑️ [Capture UI] Selected photo cleared.");
    this.selectedFile = null;
    if (this.photoInput) this.photoInput.value = "";
    if (this.previewImg) this.previewImg.src = "";
    this.hideConvertingNotice();
    if (this.uploadPrompt) this.uploadPrompt.style.display = "inline-flex";
    if (this.previewWrapper) this.previewWrapper.style.display = "none";
    if (this.uploadZone) this.uploadZone.classList.remove("has-preview");
  },

  resetForm() {
    this.form.reset();
    this.clearPhoto();
    if (this.datetimeInput) {
      this.datetimeInput.value = this.getLiveLocalDateTime();
    }
    if (this.captionInput) {
      this.captionInput.style.height = "84px";
    }
    this.setSubmitting(false);
  },

  setSubmitting(isSubmitting, label = "save memory") {
    if (this.submitBtn) {
      this.submitBtn.disabled = isSubmitting;
      const span = this.submitBtn.querySelector("span");
      if (span) {
        span.textContent = label;
      } else {
        this.submitBtn.innerHTML = `<span>${label}</span>`;
      }
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
