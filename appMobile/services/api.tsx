// services/api.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
    let token = await AsyncStorage.getItem("token");
    let refreshToken = await AsyncStorage.getItem("refreshToken");

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // 🔹 monta a URL absoluta aqui
    let response = await fetch(`${BASE_URL}${path}`, {...options, headers});

    if (response.status === 401 && refreshToken) {
        const refreshRes = await fetch(`${BASE_URL}/refresh`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({refreshToken}),
        });

        if (refreshRes.ok) {
            const {accessToken, refreshToken: newRefresh} = await refreshRes.json();
            await AsyncStorage.setItem("token", accessToken);
            await AsyncStorage.setItem("refreshToken", newRefresh);

            headers["Authorization"] = `Bearer ${accessToken}`;
            response = await fetch(`${BASE_URL}${path}`, {...options, headers});
        } else {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("refreshToken");
            throw new Error("Sessão expirada. Faça login novamente.");
        }
    }

    return response;
}
