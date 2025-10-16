import React, { createContext, useContext, useEffect, useState } from "react";
import { apiLogin, apiSignup } from "../api/auth";

type User = { userId: string; displayName?: string; groupId?: number };
type Role = "admin" | "member";
type CreateOpts = { mode: "create"; groupName: string };
type JoinOpts = { mode: "join"; inviteCode: string };

type AuthCtx = {
    user: User | null;
    login: (username: string, password: string) => Promise<void>;
    signup: (
        username: string,
        password: string,
        displayName: string | undefined,
        opts: CreateOpts | JoinOpts
    ) => Promise<{ groupCode?: string }>;
    logout: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const raw = localStorage.getItem("clubapp_auth");
        if (raw) setUser(JSON.parse(raw));
    }, []);

    function persist(u: User | null) {
        setUser(u);
        if (u) localStorage.setItem("clubapp_auth", JSON.stringify(u));
        else localStorage.removeItem("clubapp_auth");
    }

    const login = async (username: string, password: string) => {
        const res = await apiLogin(username, password);
        persist({ userId: res.userId, displayName: res.displayName, groupId: res.groupId, role: res.role });
    };

    const signup = async (
        username: string,
        password: string,
        displayName: string | undefined,
        opts: CreateOpts | JoinOpts
    ) => {
        const body =
            opts.mode === "create"
                ? { username, password, displayName, groupName: opts.groupName }
                : { username, password, displayName, inviteCode: opts.inviteCode };

        const res = await apiSignup(body as any);
        persist({ userId: res.userId, displayName, groupId: res.groupId, role: res.role });
        return { groupCode: res.groupCode };
    };

    const logout = () => persist(null);

    return <Ctx.Provider value={{ user, login, signup, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
    const v = useContext(Ctx);
    if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
    return v;
};
