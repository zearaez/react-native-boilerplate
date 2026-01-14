export type Role = 'Admin' | 'Instructor' | 'Student';

export type User = {
  id: string;
  email?: string;
  name?: string;
  role: Role;
};

export type Session = {
  user: User;
};
