import { BACKEND_BASE_URL} from "../constants"


function getLoginData() {
  if (JSON.parse(localStorage.getItem("remember-me")) ? true : false) {
    return JSON.parse(localStorage.getItem("login-data"))
  } else {
    return JSON.parse(sessionStorage.getItem("login-data"))
  }
}

export const fetchSubscriptions = async (data) => {

  const queryParams = new URLSearchParams(data).toString();
  const response = await fetch(`${BACKEND_BASE_URL}/subscriptions?${queryParams}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Auth-Token': getLoginData()
    },
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return await response.json();
};


export const createSubscription = async (data) => {
    const response = await fetch(`${BACKEND_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth-Token': getLoginData()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response;
};
  
export const deleteSubscription = async (data) => {
    const response = await fetch(`${BACKEND_BASE_URL}/subscriptions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Auth-Token': getLoginData()
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response;
};

export const deleteSubscriptionWT = async (data) => {
  const response = await fetch(`${BACKEND_BASE_URL}/unsubscribe`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return await response;
};

export const fetchTimeline = async (clientKey) => {
  const queryParams = new URLSearchParams({ client: clientKey }).toString();
  const response = await fetch(`${BACKEND_BASE_URL}/timeline?${queryParams}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Auth-Token": getLoginData(),
    },
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return await response.json();
};

export const fetchDashboardFilters = async () => {
  const response = await fetch(`${BACKEND_BASE_URL}/filters`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Auth-Token": getLoginData(),
    },
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  return await response.json();
};

async function adminRequest(path, method, body) {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Auth-Token": getLoginData(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error: ${response.status}`);
  }
  return data;
}

export const fetchAdminUsers = async () => adminRequest("/admin/users", "GET");

export const fetchAdminDistricts = async () =>
  adminRequest("/admin/districts", "GET");

export const impersonateDistrict = async ({ districtId } = {}) =>
  adminRequest("/admin/impersonate-district", "POST", {
    district_id: districtId,
  });

export const createAdminUser = async (data) =>
  adminRequest("/admin/users", "POST", data);

export const deleteAdminUser = async (userEmail) =>
  adminRequest("/admin/users/delete", "POST", { user_email: userEmail });

export const fetchDistrictBranding = async ({ districtId, districtName } = {}) => {
  const params = new URLSearchParams();
  if (districtId) params.set("district_id", districtId);
  if (districtName) params.set("district_name", districtName);
  const query = params.toString();
  return adminRequest(`/admin/branding${query ? `?${query}` : ""}`, "GET");
};

export const saveDistrictBranding = async (data) =>
  adminRequest("/admin/branding", "PUT", data);

export const uploadDistrictLogo = async (districtId, file) => {
  const formData = new FormData();
  formData.append("district_id", districtId);
  formData.append("logo", file);
  const response = await fetch(`${BACKEND_BASE_URL}/admin/branding/logo`, {
    method: "POST",
    headers: {
      "Auth-Token": getLoginData(),
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error: ${response.status}`);
  }
  return data;
};

export const fetchDistrictLocations = async (districtId) => {
  const params = new URLSearchParams({ district_id: districtId });
  return adminRequest(`/admin/locations?${params.toString()}`, "GET");
};

export const fetchLocationNarrative = async (districtId, category, location) => {
  const params = new URLSearchParams({
    district_id: districtId,
    category,
    location,
  });
  return adminRequest(`/admin/narratives?${params.toString()}`, "GET");
};

export const saveLocationNarrative = async (data) =>
  adminRequest("/admin/narratives", "PUT", data);

export const generateLocationNarrative = async (data) =>
  adminRequest("/admin/narratives/generate", "POST", data);

export const generateAllMissingNarratives = async (data) =>
  adminRequest("/admin/narratives/generate-all", "POST", data);

export const uploadLocationNarrativeImage = async (
  districtId,
  category,
  location,
  file
) => {
  const formData = new FormData();
  formData.append("district_id", districtId);
  formData.append("category", category);
  formData.append("location", location);
  formData.append("image", file);
  const response = await fetch(`${BACKEND_BASE_URL}/admin/narratives/image`, {
    method: "POST",
    headers: {
      "Auth-Token": getLoginData(),
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error: ${response.status}`);
  }
  return data;
};

