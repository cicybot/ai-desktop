const API_BASE = '/api';
const GLOBAL_API_TOKEN = '1116568a729f18c9903038ff71e70aa1685888d9e8f4ca34419b9a5d9cf784ffdf1';

const getAuthToken = (): string => {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    localStorage.setItem('auth_token', urlToken);
    window.history.replaceState({}, '', window.location.pathname);
    return urlToken;
  }
  return localStorage.getItem('auth_token') || GLOBAL_API_TOKEN;
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

export interface Group {
  id: number;
  name: string;
  description: string;
  pane_ids: string[];
  pane_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupWithPanes extends Group {
  panes: Pane[];
}

export interface Pane {
  id: number;
  pane_id: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  z_index: number;
}

export interface PaneLayoutItem {
  pane_id: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  z_index: number;
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const authApi = {
  getUser: () => fetchApi<{ id: number; email: string; name: string; avatar: string }>('/auth/me'),
  login: (token: string) => {
    setAuthToken(token);
    return authApi.getUser();
  },
  logout: () => {
    localStorage.removeItem('auth_token');
  },
};

export const groupsApi = {
  list: () => fetchApi<{ groups: Group[] }>('/groups'),

  create: (name: string, description?: string) =>
    fetchApi<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  get: (groupId: number) =>
    fetchApi<GroupWithPanes>(`/groups/${groupId}`),

  update: (groupId: number, name?: string, description?: string) =>
    fetchApi<{ success: boolean; group_id: number; updated: object }>(`/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description }),
    }),

  delete: (groupId: number) =>
    fetchApi<{ success: boolean; group_id: number }>(`/groups/${groupId}`, {
      method: 'DELETE',
    }),

  addPane: (groupId: number, paneId: string) =>
    fetchApi<{ success: boolean; group_id: number; pane_id: string }>(
      `/groups/${groupId}/panes/${paneId}`,
      { method: 'POST' }
    ),

  removePane: (groupId: number, paneId: string) =>
    fetchApi<{ success: boolean; group_id: number; pane_id: string }>(
      `/groups/${groupId}/panes/${paneId}`,
      { method: 'DELETE' }
    ),

  updatePaneLayout: (
    groupId: number,
    paneId: string,
    layout: { pos_x?: number; pos_y?: number; width?: number; height?: number; z_index?: number }
  ) =>
    fetchApi<{ success: boolean; group_id: number; pane_id: string }>(
      `/groups/${groupId}/panes/${paneId}/layout`,
      {
        method: 'PATCH',
        body: JSON.stringify(layout),
      }
    ),

  batchUpdateLayout: (groupId: number, panes: PaneLayoutItem[]) =>
    fetchApi<{ success: boolean; group_id: number; updated: number }>(
      `/groups/${groupId}/layout`,
      {
        method: 'PATCH',
        body: JSON.stringify({ panes }),
      }
    ),
};
