/** Usernames are stored in Supabase Auth as addresses on a reserved domain. */
export const loginEmail = (u: string) => (u.includes("@") ? u : `${u}@users.colearn.invalid`).toLowerCase();
