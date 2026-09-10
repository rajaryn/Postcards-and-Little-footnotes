/**
 * API client module for Postcards & Little Footnotes with Cloudflare R2 direct uploads
 */
const API = {
  baseUrl: "/api",
  tokenKey: "postcards_auth_token",
  rememberKey: "postcards_remember_device",

  getBaseUrl() {
    // If opened via local dev static server (e.g. Live Server on port 5500, 3000, 8080)
    // or file:// protocol, automatically route API requests to the Flask backend on port 5000
    if (typeof window !== "undefined" && window.location) {
      const port = window.location.port;
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      if (
        protocol === "file:" ||
        (port && port !== "5000" && (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")))
      ) {
        return `http://${hostname || "127.0.0.1"}:5000/api`;
      }
    }
    return this.baseUrl || "/api";
  },

  getToken() {
    return localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey) || "";
  },

  setToken(token, remember = true) {
    if (token) {
      if (remember) {
        localStorage.setItem(this.tokenKey, token);
        localStorage.setItem(this.rememberKey, "true");
        sessionStorage.removeItem(this.tokenKey);
      } else {
        sessionStorage.setItem(this.tokenKey, token);
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.rememberKey);
      }
    } else {
      this.clearToken();
    }
  },

  clearToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.rememberKey);
    sessionStorage.removeItem(this.tokenKey);
  },

  async request(endpoint, options = {}) {
    const baseUrl = this.getBaseUrl();
    try {
      const headers = { ...options.headers };
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.error || `Request failed with status ${response.status}`;
        const error = new Error(errorMsg);
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (error) {
      // Avoid noisy console errors for standard session check probes
      if (endpoint !== "/auth/me" || (error.status && error.status !== 401 && error.status !== 403)) {
        console.error(`❌ API Error [${endpoint}]:`, error);
      }
      throw error;
    }
  },

  // Authentication
  async register(email, password, username, remember = true) {
    const res = await this.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username, remember_me: remember }),
    });
    if (res.token) {
      this.setToken(res.token, remember);
    }
    return res;
  },

  async login(email, password, remember = true) {
    const res = await this.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, remember_me: remember }),
    });
    if (res.token) {
      this.setToken(res.token, remember);
    }
    return res;
  },

  async getMe(retry = true) {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await this.request("/auth/me");
      return res.user;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        console.warn("🔒 Auth token invalid or expired. Clearing stored session.");
        this.clearToken();
        return null;
      }

      // If transient network error / server cold start, retry once before failing
      if (retry && (!err.status || err.name === "TypeError")) {
        console.log("🔄 Retrying auth verification in 400ms...");
        await new Promise((resolve) => setTimeout(resolve, 400));
        return this.getMe(false);
      }

      console.warn("⚠️ Could not verify auth session:", err.message || err);
      return null;
    }
  },

  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } catch (err) {
      // Ignore network errors on logout
    }
    this.clearToken();
  },

  async deleteAccount() {
    const res = await this.request("/auth/account", { method: "DELETE" });
    this.clearToken();
    return res;
  },

  // Trips
  async getTrips() {
    const res = await this.request("/trips");
    return res.trips || [];
  },

  async createTrip(tripData) {
    const res = await this.request("/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tripData),
    });
    return res.trip;
  },

  async getTrip(tripId) {
    const res = await this.request(`/trips/${tripId}`);
    return res.trip;
  },

  async deleteTrip(tripId) {
    return await this.request(`/trips/${tripId}`, {
      method: "DELETE",
    });
  },

  // Presigned Uploads for Cloudflare R2
  async getPresignedUploadUrl(tripId, filename, contentType) {
    console.log(`[Upload Step 1] Requesting presigned upload URL from backend for trip ${tripId}: ${filename} (${contentType})`);
    const res = await this.request("/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trip_id: tripId,
        filename: filename,
        content_type: contentType || "image/jpeg",
      }),
    });
    console.log(`[Upload Step 2] Presigned URL received! photo_key = "${res.photo_key}"`);
    return res; // { upload_url, photo_key }
  },

  async uploadDirectToR2(uploadUrl, file, contentType) {
    console.log(`[Upload Step 3] Starting direct binary upload to Cloudflare R2 (${file.size} bytes)...`);
    const uploadStartMs = Date.now();

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType || file.type || "image/jpeg",
      },
      body: file,
    });

    if (!response.ok) {
      console.error(`❌ Direct photo upload to R2 failed with status ${response.status}`);
      throw new Error(`Direct photo upload failed (${response.status})`);
    }

    const duration = ((Date.now() - uploadStartMs) / 1000).toFixed(2);
    console.log(`[Upload Step 3] Direct upload complete to Cloudflare R2! (took ${duration}s)`);
    return true;
  },

  async uploadViaBackend(tripId, file) {
    console.log(`[Upload Step 3 - Fallback] Uploading photo through backend server to R2 (${file.size} bytes)...`);
    const uploadStartMs = Date.now();
    const formData = new FormData();
    formData.append("trip_id", tripId);
    formData.append("file", file);

    const baseUrl = this.getBaseUrl();
    const headers = {};
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}/uploads/direct`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Server upload failed (${res.status})`);
    }

    const duration = ((Date.now() - uploadStartMs) / 1000).toFixed(2);
    console.log(`[Upload Step 3 - Fallback] Upload complete via backend server! photo_key = "${data.photo_key}" (took ${duration}s)`);
    return data.photo_key;
  },

  async uploadPhoto(tripId, file) {
    try {
      // 1. Request presigned upload URL
      const presignRes = await this.getPresignedUploadUrl(
        tripId,
        file.name,
        file.type
      );

      // 2. Attempt direct upload to R2
      try {
        await this.uploadDirectToR2(
          presignRes.upload_url,
          file,
          file.type
        );
        return presignRes.photo_key;
      } catch (corsOrNetErr) {
        console.warn(`⚠️ Direct browser upload failed (e.g. CORS preflight). Automatically using server upload to R2...`, corsOrNetErr);
        // 3. Transparent fallback to backend server upload to R2
        return await this.uploadViaBackend(tripId, file);
      }
    } catch (err) {
      console.warn("⚠️ Presign request failed, trying server upload directly:", err);
      return await this.uploadViaBackend(tripId, file);
    }
  },

  // Moments
  async getTripMoments(tripId) {
    const res = await this.request(`/trips/${tripId}/moments`);
    return res.moments || [];
  },

  async createMoment(tripId, momentData) {
    console.log(`[Moment Step 4] Sending moment entry to backend for TiDB persistence:`, momentData);
    const res = await this.request(`/trips/${tripId}/moments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(momentData),
    });
    console.log(`[Moment Step 4] Moment entry successfully created in TiDB! ID = ${res.moment?.id}`);
    return res.moment;
  },

  async deleteMoment(momentId) {
    return await this.request(`/moments/${momentId}`, {
      method: "DELETE",
    });
  },

  async deleteMomentPhoto(momentId) {
    return await this.request(`/moments/${momentId}/photo`, {
      method: "DELETE",
    });
  },

  async deleteMomentFootnote(momentId) {
    return await this.request(`/moments/${momentId}/footnote`, {
      method: "DELETE",
    });
  },
};

window.API = API;
