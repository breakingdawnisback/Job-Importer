export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// WebSocket URL - leave empty to disable WebSocket connections
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export const API_ENDPOINTS = {
  FEEDS: `${API_BASE_URL}/api/feeds`,
  IMPORT_LOGS: `${API_BASE_URL}/api/import-logs`,
  IMPORT_START: `${API_BASE_URL}/api/import/start`,
  IMPORT_STATUS: (id: string) => `${API_BASE_URL}/api/import/status/${id}`,
  JOBS: `${API_BASE_URL}/api/jobs`,
};