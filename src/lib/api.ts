import axios from 'axios';

const API_BASE = 'https://g-fast-api.cicy.de5.net/api';

const getAuthToken = (): string => {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get('token');
  if (urlToken) {
    localStorage.setItem('token', urlToken);
    window.history.replaceState({}, '', window.location.pathname);
    return urlToken;
  }
  return localStorage.getItem('token') || '';
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
};

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export interface TmuxCreateRequest {
  win_name?: string | null;
  dev?: boolean;
  workspace?: string | null;
  init_script?: string;
  use_local_ip?: boolean;
  title?: string | null;
  proxy?: string | null;
  tg_token?: string | null;
  tg_chat_id?: string | null;
  tg_enable?: boolean;
}

export const authApi = {
  verify: async () => {
    const { data } = await api.get('/auth/verify');
    return data;
  },
  logout: () => {
    localStorage.removeItem('token');
  },
};

export const groupsApi = {
  list: async () => {
    const { data } = await api.get<{ groups: Group[] }>('/groups');
    return data;
  },

  create: async (name: string, description?: string) => {
    const { data } = await api.post<Group>('/groups', { name, description });
    return data;
  },

  get: async (groupId: number) => {
    const { data } = await api.get<GroupWithPanes>(`/groups/${groupId}`);
    return data;
  },

  update: async (groupId: number, name?: string, description?: string) => {
    const { data } = await api.patch<{ success: boolean; group_id: number; updated: object }>(`/groups/${groupId}`, { name, description });
    return data;
  },

  delete: async (groupId: number) => {
    const { data } = await api.delete<{ success: boolean; group_id: number }>(`/groups/${groupId}`);
    return data;
  },

  addPane: async (groupId: number, paneId: string) => {
    const { data } = await api.post<{ success: boolean; group_id: number; pane_id: string }>(`/groups/${groupId}/panes/${paneId}`);
    return data;
  },

  removePane: async (groupId: number, paneId: string) => {
    const { data } = await api.delete<{ success: boolean; group_id: number; pane_id: string }>(`/groups/${groupId}/panes/${paneId}`);
    return data;
  },

  updatePaneLayout: async (
    groupId: number,
    paneId: string,
    layout: { pos_x?: number; pos_y?: number; width?: number; height?: number; z_index?: number }
  ) => {
    const { data } = await api.patch<{ success: boolean; group_id: number; pane_id: string }>(`/groups/${groupId}/panes/${paneId}/layout`, layout);
    return data;
  },

  batchUpdateLayout: async (groupId: number, panes: PaneLayoutItem[]) => {
    const { data } = await api.patch<{ success: boolean; group_id: number; updated: number }>(`/groups/${groupId}/layout`, { panes });
    return data;
  },
};

export const tmuxApi = {
  create: async (params: TmuxCreateRequest) => {
    const { data } = await api.post('/tmux/create', params);
    return data;
  },

  list: async () => {
    const { data } = await api.get('/tmux-list');
    return data;
  },

  getPane: async (paneId: string) => {
    const { data } = await api.get(`/tmux/panes/${paneId}`);
    return data;
  },

  deletePane: async (paneId: string) => {
    const { data } = await api.delete(`/tmux/panes/${paneId}`);
    return data;
  },

  restartPane: async (paneId: string) => {
    const { data } = await api.post(`/tmux/panes/${paneId}/restart`);
    return data;
  },

  renamePane: async (paneId: string, title: string) => {
    const { data } = await api.patch(`/tmux/panes/${paneId}`, { title });
    return data;
  },

  send: async (paneId: string, command: string) => {
    const { data } = await api.post('/tmux/send', { pane_id: paneId, command });
    return data;
  },

  clear: async (paneId: string) => {
    const { data } = await api.post('/tmux/clear', { pane_id: paneId });
    return data;
  },
};

export const appsApi = {
  list: async () => {
    const { data } = await api.get<{ apps: { id: number; name: string; url: string; icon: string }[] }>('/apps');
    return data;
  },
  create: async (name: string, url: string, icon?: string) => {
    const { data } = await api.post('/apps', { name, url, icon });
    return data;
  },
  update: async (id: number, updates: { name?: string; url?: string; icon?: string }) => {
    const { data } = await api.patch(`/apps/${id}`, updates);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/apps/${id}`);
    return data;
  },
};

export const ttydApi = {
  start: async (paneId: string) => {
    const { data } = await api.post(`/ttyd/start/${paneId}`);
    return data;
  },

  status: async (paneId: string) => {
    const { data } = await api.get(`/ttyd/status/${paneId}`);
    return data;
  },

  config: async (paneId: string) => {
    const { data } = await api.get(`/ttyd/config/${paneId}`);
    return data;
  },

  list: async () => {
    const { data } = await api.get('/ttyd/list');
    return data;
  },

  getByName: async (name: string) => {
    const { data } = await api.get(`/ttyd/by-name/${name}`);
    return data;
  },
};
