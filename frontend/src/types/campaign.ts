export interface Sender {
  id: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
  createdAt: string;
  updatedAt: string;
  sender?: {
    email: string;
  };
  _count?: {
    emails: number;
  };
}
