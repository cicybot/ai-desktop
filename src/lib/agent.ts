const WS_BASE = 'wss://g-fast-api.cicy.de5.net/ws/agent';

export type AgentAction =
  | { type: 'add_terminal'; title?: string }
  | { type: 'add_iframe'; url: string; title?: string }
  | { type: 'close_window'; window_id: string }
  | { type: 'close_all' }
  | { type: 'resize_window'; window_id: string; x?: number; y?: number; width?: number; height?: number }
  | { type: 'grid_layout' }
  | { type: 'focus_window'; window_id: string }
  | { type: 'minimize_window'; window_id: string }
  | { type: 'maximize_window'; window_id: string }
  | { type: 'restart_terminal'; window_id: string }
  | { type: 'send_command'; window_id: string; command: string }
  | { type: 'message'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'error'; content: string };

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: AgentAction[];
}

type OnAction = (action: AgentAction) => void;
type OnStatus = (status: 'connected' | 'disconnected' | 'connecting') => void;

export class DesktopAgent {
  private ws: WebSocket | null = null;
  private groupId: number;
  private token: string;
  private onAction: OnAction;
  private onStatus: OnStatus;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private alive = true;

  constructor(groupId: number, token: string, onAction: OnAction, onStatus: OnStatus) {
    this.groupId = groupId;
    this.token = token;
    this.onAction = onAction;
    this.onStatus = onStatus;
    this.connect();
  }

  private connect() {
    if (!this.alive) return;
    this.onStatus('connecting');

    const url = `${WS_BASE}/${this.groupId}?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.onStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // 后端可以发单个 action 或 actions 数组
        if (data.actions && Array.isArray(data.actions)) {
          for (const action of data.actions) {
            this.onAction(action);
          }
        } else if (data.type) {
          this.onAction(data as AgentAction);
        }
      } catch (e) {
        console.error('Agent WS parse error:', e);
      }
    };

    this.ws.onclose = () => {
      this.onStatus('disconnected');
      if (this.alive) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  send(content: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'chat', content, group_id: this.groupId }));
    }
  }

  destroy() {
    this.alive = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}
