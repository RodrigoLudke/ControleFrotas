import { useState } from "react";
import {
    Pressable,
    TextInput,
    StyleSheet,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {Colors} from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

// Use a variável de ambiente para a URL base
// Para testar no emulador/navegador:
const BASE_URL = process.env.LOCALHOST;

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const router = useRouter();
    const colorScheme = useColorScheme() as "light" | "dark";

    const handleLogin = async () => {
        try {
            const response = await fetch(`${BASE_URL}/index`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, senha }),
            });

            const data = await response.json();
            console.log("Resposta do servidor:", data);

            if (response.ok) {
                await AsyncStorage.setItem("token", data.accessToken);
                await AsyncStorage.setItem("refreshToken", data.refreshToken);
                Alert.alert("Sucesso", "Login realizado!");
                router.replace("/(tabs)");
            } else {
                Alert.alert("Erro", data.error || "Falha no login");
            }
        } catch (error) {
            Alert.alert("Erro", "Não foi possível conectar ao servidor");
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                Bem-vindo
            </ThemedText>

            <TextInput
                style={[styles.input, {borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text,},]}
                placeholder="Email"
                placeholderTextColor={Colors[colorScheme].icon}
                value={email}
                onChangeText={setEmail}
            />
            <TextInput
                style={[styles.input, {borderColor: Colors[colorScheme].tint, color: Colors[colorScheme].text,},]}
                placeholder="Senha"
                placeholderTextColor={Colors[colorScheme].icon}
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
            />

            <Pressable style={[styles.button, { backgroundColor: Colors[colorScheme].tint }]} onPress={handleLogin}>
                <ThemedText
                    style={[
                        styles.buttonText, {color: Colors[colorScheme].background,},]}>Entrar
                </ThemedText>
            </Pressable>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    title: { fontSize: 28, fontWeight: "bold", marginBottom: 30 },
    input: {
        width: "100%",
        padding: 12,
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        width: "100%",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    buttonText: {
        fontSize: 18,
        fontWeight: "600",
    },
});
