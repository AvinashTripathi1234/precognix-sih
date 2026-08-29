const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function fetchHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchStatus() {
  const response = await fetch(`${API_BASE_URL}/api/status`);
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function testSupabase() {
  const response = await fetch(`${API_BASE_URL}/api/supabase-test`);
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
  }
  return response.json();
}
