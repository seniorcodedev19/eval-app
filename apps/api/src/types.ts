export type Role = "admin" | "manager" | "member";

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  team_id: number | null;
  active: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
