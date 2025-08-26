// services/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.LOCALHOST;

export async function apiFetch(url: string, options: RequestInit = {}) {
    let token = await AsyncStorage.getItem("token");
    let refreshToken = await AsyncStorage.getItem("refreshToken");

    // força os headers a serem um objeto do tipo correto
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>), // merge se já veio algo
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Se o access token expirou
    if (response.status === 401 && refreshToken) {
        const refreshRes = await fetch(`${BASE_URL}/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
            const { accessToken, refreshToken: newRefresh } = await refreshRes.json();
            await AsyncStorage.setItem("token", accessToken);
            await AsyncStorage.setItem("refreshToken", newRefresh);

            // tenta a request original de novo, agora com o token novo
            headers["Authorization"] = `Bearer ${accessToken}`;
            response = await fetch(url, { ...options, headers });
        } else {
            // refresh falhou → desloga usuário
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("refreshToken");
            throw new Error("Sessão expirada. Faça login novamente.");
        }
    }

    return response;
}
