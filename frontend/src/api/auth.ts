const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

type Json<T> = Promise<T>;
async function j<T>(res: Response): Json<T> {
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
    }
    return res.json() as Json<T>;
}

// Backend expects "username" (you can pass an email string as username)
export async function apiLogin(username: string, password: string) {
    return j<{ ok: true; userId: string; displayName?: string; groupId?: number }>(
        await fetch(`${API}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        })
    );
}

type SignupBody =
    | { username: string; password: string; displayName?: string; groupName: string }
    | { username: string; password: string; displayName?: string; inviteCode: string };

export async function apiSignup(body: SignupBody) {
    return j<{ ok: true; userId: string; groupId: number; groupCode?: string }>(
        await fetch(`${API}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        })
    );
}
