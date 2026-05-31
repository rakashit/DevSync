import { auth } from '../firebase';

const API_BASE_URL = 'http://localhost:5000/api';

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const createRoom = async (title: string, description: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, description }),
  });
  if (!response.ok) {
    throw new Error('Failed to create room');
  }
  return response.json();
};

export const fetchRooms = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to fetch rooms');
  }
  return response.json();
};

export const fetchAIReview = async (code: string, language: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/ai/review`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, language }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch AI review');
  }
  return response.json();
};

export const fetchAIAutocomplete = async (codeBeforeCursor: string, language: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/ai/autocomplete`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ codeBeforeCursor, language }),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch AI autocomplete');
  }
  return response.json();
};

export const fetchGitHubPR = async (url: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/github/import-pr`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to import GitHub PR');
  }
  return response.json();
};

export const executeCode = async (code: string, language: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, language }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to execute code');
  }
  return response.json();
};

export const deleteRoom = async (roomId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    throw new Error('Failed to delete room');
  }
  return response.json();
};
