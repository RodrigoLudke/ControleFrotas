// painelWebAdmin/src/services/api.tsx

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface QueuedRequest {
    path: string;
    options: RequestInit;
    resolve: (value: Response) => void;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    reject: (reason?: any) => void;
}

let isRefreshing = false;
let failedQueue: QueuedRequest[] = [];

// A função foi ajustada para lidar com await
const processQueue = async (error: Error | null, newAccessToken: string | null = null) => {
    for (const prom of failedQueue) {
        if (error) {
            prom.reject(error);
        } else {
            const newHeaders: Record<string, string> = {
                "Content-Type": "application/json",
                ...(prom.options.headers as Record<string, string>),
            };
            if (newAccessToken) {
                newHeaders["Authorization"] = `Bearer ${newAccessToken}`;
            }

            try {
                // A requisição é aguardada antes de chamar o resolve
                const response = await fetch(`${API_BASE_URL}${prom.path}`, {...prom.options, headers: newHeaders});
                prom.resolve(response);
            } catch (err) {
                prom.reject(err);
            }
        }
    }

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

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {...options, headers});

        if (response.status === 401 && refreshToken) {
            if (isRefreshing) {
                return new Promise<Response>((resolve, reject) => {
                    failedQueue.push({resolve, reject, path, options});
                });
            }

            isRefreshing = true;

            const refreshRes = await fetch(`${API_BASE_URL}/refresh`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({refreshToken}),
            });

            if (refreshRes.ok) {
                const {accessToken, refreshToken: newRefresh} = await refreshRes.json();
                localStorage.setItem("token", accessToken);
                localStorage.setItem("refreshToken", newRefresh);
                isRefreshing = false;
                await processQueue(null, accessToken);

                const newHeaders: Record<string, string> = {
                    "Content-Type": "application/json",
                    ...(options.headers as Record<string, string>),
                    "Authorization": `Bearer ${accessToken}`,
                };

                return await fetch(`${API_BASE_URL}${path}`, {...options, headers: newHeaders});
            } else {
                isRefreshing = false;
                await processQueue(new Error("Sessão expirada. Faça login novamente."));
                localStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                globalThis.location.href = '/login';
                throw new Error("Sessão expirada. Faça login novamente.");
            }
        }

        if (!response.ok) {
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            throw new Error(`Erro do servidor: ${response.statusText}`);
        }

        return response;
    } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        globalThis.location.href = '/login';
        throw err;
    }
}