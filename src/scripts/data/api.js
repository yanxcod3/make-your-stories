import CONFIG from '../config';

const BASE = CONFIG.BASE_URL;

export async function register({ name, email, password }) {
  const response = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });
  return response.json();
}

export async function login({ email, password }) {
  const response = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function postGuestStory(formData) {
  // formData is expected to be a FormData instance containing:
  // description (string), photo (File), lat (optional), lon (optional)
  const response = await fetch(`${BASE}/stories/guest`, {
    method: 'POST',
    // Don't set Content-Type; browser will set multipart/form-data with boundary
    body: formData,
  });
  return response.json();
}

export async function postStory(formData) {
  // Post story for authenticated users. Token is read from localStorage.
  const token = localStorage.getItem('token');
  const response = await fetch(`${BASE}/stories`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do not set Content-Type so browser sets multipart/form-data boundary
    },
    body: formData,
  });
  return response.json();
}

export async function getAllStories({ page = 1, size = 10, location = 0 } = {}) {
  // Builds query string for optional params
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (size) params.append('size', size);
  if (typeof location !== 'undefined') params.append('location', location);

  const token = localStorage.getItem('token');

  const response = await fetch(`${BASE}/stories?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });
  return response.json();
}