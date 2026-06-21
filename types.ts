export interface Report {
  date: string;
  day: string;
  file: string;
  title: string;
  excerpt: string;
  pairs: string[];
  version: string;
  category: 'daily' | 'weekly' | 'macro';
}

export interface UserSession {
  userId: string;
  userName: string;
  token: string;
}
