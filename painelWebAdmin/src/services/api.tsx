// painel-admin/services/api.ts

const API_BASE_URL = import.meta.env.VITE_API_URL;

let isRefreshing = false;
let failedQueue: ((token: string) => void)[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom(null);
        } else {
            prom(token);
        }
    });

    failedQueue = [];
};

export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    // Se o token de acesso falhar e não estivermos já renovando
    if (response.status === 401 && refreshToken && !isRefreshing) {
        isRefreshing = true;

        const refreshRes = await fetch(`${API_BASE_URL}/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
            const { accessToken, refreshToken: newRefresh } = await refreshRes.json();
            localStorage.setItem("token", accessToken);
            localStorage.setItem("refreshToken", newRefresh);
            isRefreshing = false;
            processQueue(null, accessToken);

            headers["Authorization"] = `Bearer ${accessToken}`;
            response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
        } else {
            isRefreshing = false;
            processQueue(new Error("Sessão expirada. Faça login novamente."));
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            window.location.href = '/login';
            throw new Error("Sessão expirada. Faça login novamente.");
        }
    } else if (response.status === 401 && refreshToken && isRefreshing) {
        // Se já houver um processo de renovação, enfileira a requisição atual
        return new Promise((resolve, reject) => {
            failedQueue.push(async newToken => {
                if (newToken === null) {
                    reject(new Error("Sessão expirada. Faça login novamente."));
                    return;
                }
                headers["Authorization"] = `Bearer ${newToken}`;
                try {
                    const newResponse = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
                    resolve(newResponse);
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    // Para qualquer outro erro, ou se não houver refresh token
    if (!response.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = '/login';
        throw new Error(`Erro do servidor: ${response.statusText}`);
    }

    return response;
}