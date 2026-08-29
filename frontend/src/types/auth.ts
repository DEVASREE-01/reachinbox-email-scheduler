export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  connectedAt: string | null;
}
