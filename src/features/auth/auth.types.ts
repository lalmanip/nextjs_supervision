export type SupervisionUser = {
  userId?: number;
  userType?: number;
  email?: string | null;
  userName?: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type LoginInput = {
  userName: string;
  password: string;
};

export type LoginResponse = {
  status: "success";
  user: SupervisionUser | null;
};

