export type WindowType = 'ttyd' | 'preview';

export interface WindowState {
  id: string;
  type: WindowType;
  title: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
}

export interface DesktopState {
  id: string;
  name: string;
  windows: WindowState[];
  wallpaper: string;
  activeConversationId: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  desktopId: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
}

export interface Plan {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  price: number;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['3 Desktops', 'Basic Terminal', 'Community Support']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 10,
    features: ['Unlimited Desktops', 'Advanced Terminal', 'Priority Support', 'AI Copilot']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 29,
    features: ['Custom Solutions', 'Dedicated Support', 'SLA', 'On-premise Deployment']
  }
];

export const DEFAULT_TTYD_URL = "https://ttyd-dev.cicy.de5.net/?token=6568a729f18c9903038ff71e70aa1685888d9e8f4ca34419b9a5d9cf784ffdf1&bot_name=w-20020:main.0&iframe=1";
