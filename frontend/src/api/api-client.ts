// Central API client for all backend requests
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// Helper to handle JSON responses
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
    }
    return response.json();
}

// Helper to get auth header
function getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// ============= AUTH API =============

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    ok: boolean;
    userId: string;
    displayName?: string;
    groupId?: number;
    role: 'admin' | 'member';
    token: string;
}

export interface SignupRequest {
    email: string;
    password: string;
    name: string;
    groupName?: string;
    inviteCode?: string;
}

export interface SignupResponse {
    ok: boolean;
    userId: string;
    groupId: number;
    role: 'admin' | 'member';
    groupCode?: string;
    token: string;
}

export const authAPI = {
    login: (data: LoginRequest): Promise<LoginResponse> =>
        fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(res => handleResponse<LoginResponse>(res)),

    signup: (data: SignupRequest): Promise<SignupResponse> =>
        fetch(`${API_BASE_URL}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(res => handleResponse<SignupResponse>(res)),

    getMe: (): Promise<{
        user_id: string;
        email: string;
        display_name?: string;
        group_id?: number;
        role?: 'admin' | 'member';
    }> =>
        fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: getAuthHeader(),
        }).then(handleResponse),
};

// ============= GROUPS API =============

export interface Group {
    group_id: number;
    name: string;
    description?: string;
    invite_code: string;
    created_at: string;
    member_count: number;
}

export const groupsAPI = {
    getMyGroup: (): Promise<Group> =>
        fetch(`${API_BASE_URL}/api/groups/`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    updateGroup: (data: { name?: string; description?: string }): Promise<Group> =>
        fetch(`${API_BASE_URL}/api/groups/`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        }).then(handleResponse),

    regenerateInviteCode: (): Promise<{ invite_code: string }> =>
        fetch(`${API_BASE_URL}/api/groups/invite-code`, {
            method: 'POST',
            headers: getAuthHeader(),
        }).then(handleResponse),

    getSettings: (): Promise<Record<string, any>> =>
        fetch(`${API_BASE_URL}/api/groups/settings`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    updateSettings: (settings: Record<string, any>): Promise<{ ok: boolean; message: string }> =>
        fetch(`${API_BASE_URL}/api/groups/settings`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(settings),
        }).then(handleResponse),
};

// ============= MEMBERS API =============

export interface Member {
    user_id: string;
    email: string;
    display_name?: string;
    phone?: string;
    role: 'admin' | 'member';
    joined_at: string;
    status: string;
}

export const membersAPI = {
    getAll: (): Promise<Member[]> =>
        fetch(`${API_BASE_URL}/api/members/`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    getById: (memberId: string): Promise<Member> =>
        fetch(`${API_BASE_URL}/api/members/${memberId}`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    update: (memberId: string, data: { display_name?: string; phone?: string }): Promise<Member> =>
        fetch(`${API_BASE_URL}/api/members/${memberId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        }).then(handleResponse),

    updateRole: (memberId: string, role: 'admin' | 'member'): Promise<Member> =>
        fetch(`${API_BASE_URL}/api/members/${memberId}/role`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify({ role }),
        }).then(handleResponse),

    remove: (memberId: string): Promise<{ ok: boolean; message: string }> =>
        fetch(`${API_BASE_URL}/api/members/${memberId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        }).then(handleResponse),
};

// ============= EVENTS API =============

export interface Event {
    event_id: string;
    group_id: number;
    title: string;
    description?: string;
    event_date: string;
    event_time: string;
    location?: string;
    event_type: 'PRACTICE' | 'GAME' | 'MEETING' | 'OTHER';
    created_by: string;
    created_at: string;
}

export interface CreateEventRequest {
    title: string;
    description?: string;
    event_date: string;
    event_time: string;
    location?: string;
    event_type: 'PRACTICE' | 'GAME' | 'MEETING' | 'OTHER';
}

export const eventsAPI = {
    getAll: (params?: {
        start_date?: string;
        end_date?: string;
        event_type?: string;
    }): Promise<Event[]> => {
        const query = new URLSearchParams();
        if (params?.start_date) query.append('start_date', params.start_date);
        if (params?.end_date) query.append('end_date', params.end_date);
        if (params?.event_type) query.append('event_type', params.event_type);

        return fetch(`${API_BASE_URL}/api/events/?${query}`, {
            headers: getAuthHeader(),
        }).then(handleResponse);
    },

    getUpcoming: (limit: number = 10): Promise<Event[]> =>
        fetch(`${API_BASE_URL}/api/events/upcoming?limit=${limit}`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    getById: (eventId: string): Promise<Event> =>
        fetch(`${API_BASE_URL}/api/events/${eventId}`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    create: (data: CreateEventRequest): Promise<Event> =>
        fetch(`${API_BASE_URL}/api/events/`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        }).then(handleResponse),

    update: (eventId: string, data: Partial<CreateEventRequest>): Promise<Event> =>
        fetch(`${API_BASE_URL}/api/events/${eventId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        }).then(handleResponse),

    delete: (eventId: string): Promise<{ ok: boolean; message: string }> =>
        fetch(`${API_BASE_URL}/api/events/${eventId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        }).then(handleResponse),
};

// ============= PAYMENTS API =============

export interface Payment {
    payment_id: string;
    group_id: number;
    user_id: string;
    user_name: string;
    amount: number;
    description: string;
    payment_type: 'CHARGE' | 'CREDIT';
    status: 'PENDING' | 'PAID' | 'OVERDUE';
    due_date?: string;
    paid_date?: string;
    created_by: string;
    created_at: string;
}

export interface CreatePaymentRequest {
    user_id: string;
    amount: number;
    description: string;
    payment_type?: 'CHARGE' | 'CREDIT';
    due_date?: string;
}

export interface BulkChargeRequest {
    user_ids: string[];
    amount: number;
    description: string;
    due_date?: string;
}

export interface BulkCreditRequest {
    user_ids: string[];
    amount: number;
    description: string;
}

export interface MemberBalance {
    user_id: string;
    user_name: string;
    balance: number;
}

export interface PaymentStatistics {
    total_money_owed: number;
    total_money_collected: number;
    total_payments_count: number;
}

export const paymentsAPI = {
    getAll: (params?: { user_id?: string; status?: string }): Promise<Payment[]> => {
        const query = new URLSearchParams();
        if (params?.user_id) query.append('user_id_filter', params.user_id);
        if (params?.status) query.append('status', params.status);

        return fetch(`${API_BASE_URL}/api/payments/?${query}`, {
            headers: getAuthHeader(),
        }).then(handleResponse);
    },

    getBalances: (): Promise<MemberBalance[]> =>
        fetch(`${API_BASE_URL}/api/payments/balances`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    getMyBalance: (): Promise<{ balance: number }> =>
        fetch(`${API_BASE_URL}/api/payments/my-balance`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    getById: (paymentId: string): Promise<Payment> =>
        fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    create: (data: CreatePaymentRequest): Promise<Payment> =>
        fetch(`${API_BASE_URL}/api/payments/`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        }).then(handleResponse),

    bulkCharge: (data: BulkChargeRequest): Promise<Payment[]> =>
        fetch(`${API_BASE_URL}/api/payments/bulk-charge`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        }).then(handleResponse),

    bulkCredit: (data: BulkCreditRequest): Promise<Payment[]> =>
        fetch(`${API_BASE_URL}/api/payments/bulk-credit`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify(data),
        }).then(handleResponse),

    getStatistics: (): Promise<PaymentStatistics> =>
        fetch(`${API_BASE_URL}/api/payments/statistics`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    updateStatus: (paymentId: string, status: 'PENDING' | 'PAID' | 'OVERDUE'): Promise<Payment> =>
        fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify({ status }),
        }).then(handleResponse),

    delete: (paymentId: string): Promise<{ ok: boolean; message: string }> =>
        fetch(`${API_BASE_URL}/api/payments/${paymentId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        }).then(handleResponse),
};

// ============= PHOTOS API =============

export interface Photo {
    photo_id: string;
    group_id: number;
    url: string;
    thumbnail_url?: string;
    caption?: string;
    uploaded_by: string;
    uploader_name: string;
    uploaded_at: string;
}

export const photosAPI = {
    getAll: (params?: { limit?: number; offset?: number }): Promise<Photo[]> => {
        const query = new URLSearchParams();
        if (params?.limit) query.append('limit', params.limit.toString());
        if (params?.offset) query.append('offset', params.offset.toString());

        return fetch(`${API_BASE_URL}/api/photos/?${query}`, {
            headers: getAuthHeader(),
        }).then(handleResponse);
    },

    getById: (photoId: string): Promise<Photo> =>
        fetch(`${API_BASE_URL}/api/photos/${photoId}`, {
            headers: getAuthHeader(),
        }).then(handleResponse),

    upload: (file: File, caption?: string): Promise<Photo> => {
        const formData = new FormData();
        formData.append('file', file);
        if (caption) formData.append('caption', caption);

        const token = localStorage.getItem('authToken');
        return fetch(`${API_BASE_URL}/api/photos/upload`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        }).then(handleResponse);
    },

    updateCaption: (photoId: string, caption: string): Promise<Photo> =>
        fetch(`${API_BASE_URL}/api/photos/${photoId}`, {
            method: 'PUT',
            headers: getAuthHeader(),
            body: JSON.stringify({ caption }),
        }).then(handleResponse),

    delete: (photoId: string): Promise<{ ok: boolean; message: string }> =>
        fetch(`${API_BASE_URL}/api/photos/${photoId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        }).then(handleResponse),

    getCount: (): Promise<{ count: number }> =>
        fetch(`${API_BASE_URL}/api/photos/stats/count`, {
            headers: getAuthHeader(),
        }).then(handleResponse),
};

// ============= CHAT API =============

export interface Message {
    message_id: string;
    group_id: number;
    user_id: string;
    user_name: string;
    content: string;
    created_at: string;
}

export const chatAPI = {
    getMessages: (params?: { limit?: number; before?: string }): Promise<Message[]> => {
        const query = new URLSearchParams();
        if (params?.limit) query.append('limit', params.limit.toString());
        if (params?.before) query.append('before', params.before);

        return fetch(`${API_BASE_URL}/api/chat/messages?${query}`, {
            headers: getAuthHeader(),
        }).then(handleResponse);
    },

    sendMessage: (content: string): Promise<Message> =>
        fetch(`${API_BASE_URL}/api/chat/messages`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ content }),
        }).then(handleResponse),

    deleteMessage: (messageId: string): Promise<{ ok: boolean; message: string }> =>
        fetch(`${API_BASE_URL}/api/chat/messages/${messageId}`, {
            method: 'DELETE',
            headers: getAuthHeader(),
        }).then(handleResponse),

    // WebSocket connection helper
    connectWebSocket: (token: string): WebSocket => {
        const wsUrl = API_BASE_URL.replace('http', 'ws');
        return new WebSocket(`${wsUrl}/api/chat/ws?token=${token}`);
    },
};

// Export everything as default
export default {
    auth: authAPI,
    groups: groupsAPI,
    members: membersAPI,
    events: eventsAPI,
    payments: paymentsAPI,
    photos: photosAPI,
    chat: chatAPI,
};