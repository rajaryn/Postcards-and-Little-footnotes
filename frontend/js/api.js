/**
 * API client module for Postcards & Little Footnotes with Cloudflare R2 direct uploads
 */
const API = {
  baseUrl: "/api",

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.error || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error(`❌ API Error [${endpoint}]:`, error);
      throw error;
    }
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

    const res = await fetch(`${this.baseUrl}/uploads/direct`, {
      method: "POST",
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
};

window.API = API;
