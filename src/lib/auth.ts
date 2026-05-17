export interface User {
  id: string;
  username: string;
  // In a real app, you would not store the password directly.
  // For simplicity, we store it here (not secure).
  password: string;
}

const USERS_KEY = 'users';
const CURRENT_USER_KEY = 'currentUser';

export function getUsers(): Record<string, User> {
  const json = localStorage.getItem(USERS_KEY);
  return json ? JSON.parse(json) : {};
}

export function saveUsers(users: Record<string, User>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function registerUser(username: string, password: string): User | null {
  const users = getUsers();
  if (users[username]) {
    return null; // already exists
  }
  const id = Math.random().toString(36).substr(2, 9);
  const newUser: User = { id, username, password };
  users[username] = newUser;
  saveUsers(users);
  return newUser;
}

export function loginUser(username: string, password: string): User | null {
  const users = getUsers();
  const user = users[username];
  if (user && user.password === password) {
    return user;
  }
  return null;
}

export function getCurrentUser(): User | null {
  const json = localStorage.getItem(CURRENT_USER_KEY);
  return json ? JSON.parse(json) : null;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}
