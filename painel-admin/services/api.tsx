// painel-admin/services/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

    console.log("Token usado:", headers["Authorization"]);

    let response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    // VERIFICAÇÃO PRINCIPAL: Lida com qualquer resposta não-OK antes de prosseguir
    if (!response.ok) {
        // Primeiro, tenta renovar o token apenas se o erro for 401 e tivermos um refreshToken
        if (response.status === 401 && refreshToken) {
            const refreshRes = await fetch(`${API_BASE_URL}/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
                const { accessToken, refreshToken: newRefresh } = await refreshRes.json();
                localStorage.setItem("token", accessToken);
                localStorage.setItem("refreshToken", newRefresh);

                headers["Authorization"] = `Bearer ${accessToken}`;
                response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
            } else {
                // Se a renovação do token falhar, a sessão é inválida
                localStorage.removeItem("token");
                localStorage.removeItem("refreshToken");
                window.location.href = '/login';
                throw new Error("Sessão expirada. Faça login novamente.");
            }
        } else {
            // Para qualquer outro erro (403, 401 sem refresh token, etc.), redireciona para login
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            //window.location.href = '/login';
            throw new Error(`Erro do servidor: ${response.statusText}`);
        }
    }

    return response;
}