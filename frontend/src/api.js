const API = "/api";

export function token() {
  return localStorage.getItem("amir_owner_token") || "";
}

function handleUnauthorized(status, authToken) {
  if (status === 401 && authToken) {
    localStorage.removeItem("amir_owner_token");
    window.dispatchEvent(new Event("amir:unauthorized"));
  }
}

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const authToken = token();

  if (authToken && !headers.Authorization) {
    headers.Authorization = "Bearer " + authToken;
  }

  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    handleUnauthorized(response.status, authToken);
    const error = new Error(data.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export function uploadProductImage(file, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const formData = new FormData();
    const authToken = token();
    formData.append("image", file, file.name);

    request.open("POST", `${API}/products/upload`);
    if (authToken) request.setRequestHeader("Authorization", `Bearer ${authToken}`);

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    request.addEventListener("load", () => {
      let data = {};
      try {
        data = JSON.parse(request.responseText);
      } catch {
        data = {};
      }

      if (request.status < 200 || request.status >= 300) {
        handleUnauthorized(request.status, authToken);
        const error = new Error(
          data.message || `Image upload failed (${request.status}).`,
        );
        error.status = request.status;
        reject(error);
        return;
      }

      resolve(data);
    });

    request.addEventListener("error", () => {
      reject(new Error("Could not reach the server. Check your connection and try again."));
    });
    request.addEventListener("abort", () => {
      reject(new Error("Image upload was cancelled."));
    });
    request.send(formData);
  });
}
