export type Role = "admin" | "manager" | "member";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  team_id: number | null;
  active: boolean;
  avatar?: string | null;
  is_bidder?: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      rawBody?: string;
    }
  }
}
