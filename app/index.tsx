import { useState } from "react";
import {
    Alert,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Mail, Lock, Truck } from "lucide-react-native";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? "light"];

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
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={[styles.keyboardAvoidingView, { backgroundColor: theme.primary }]}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.contentContainer}>
                    {/* Logo + título */}
                    <View style={styles.header}>
                        <Image
                            source={require("@/assets/images/CF-logoWhite.png")}
                            style={styles.logo}
                        />
                        {/*<Text style={[styles.title, { color: theme.textBack }]}>Controle de Frotas</Text>*/}
                        <Text style={[styles.subtitle, { color: theme.iconBack }]}>
                            Sistema profissional de gestão de veículos
                        </Text>
                    </View>

                    {/* Card */}
                    <View style={[styles.card, { backgroundColor: theme.background }]}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>Entrar</Text>
                        <Text style={[styles.cardDescription, { color: theme.icon }]}>
                            Acesse sua conta para gerenciar a frota
                        </Text>

                        {/* Form */}
                        <View style={styles.form}>
                            {/* Campo email */}
                            <View
                                style={[
                                    styles.inputGroup,
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                ]}
                            >
                                <Mail size={18} color={theme.icon} style={styles.icon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Email"
                                    placeholderTextColor={theme.icon}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Campo senha */}
                            <View
                                style={[
                                    styles.inputGroup,
                                    { backgroundColor: theme.card, borderColor: theme.border },
                                ]}
                            >
                                <Lock size={18} color={theme.icon} style={styles.icon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Senha"
                                    placeholderTextColor={theme.icon}
                                    secureTextEntry
                                    value={senha}
                                    onChangeText={setSenha}
                                />
                            </View>

                            {/* Botão */}
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.primary }]}
                                onPress={handleLogin}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <View style={styles.buttonContent}>
                                        <Truck size={18} color="#fff" style={{ marginRight: 6 }} />
                                        <Text style={styles.buttonText}>Entrar</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Rodapé */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: theme.iconBack }]}>
                            Problemas para acessar?{" "}
                            <Text style={[styles.footerLink, { color: theme.textBack }]}>
                                Entre em contato
                            </Text>
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    contentContainer: {
        width: "100%",
        maxWidth: 400, // opcional, para telas maiores
        padding: 20,
        alignItems: 'center',
    },
    header: {
        alignItems: "center",
        marginBottom: 30,
    },
    logo: {
        width: 264,
        height: 264,
        marginBottom: -40,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
        textAlign: "center",
    },
    card: {
        borderRadius: 16,
        padding: 20,
        width: "100%",
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        textAlign: "center",
        marginBottom: 20,
    },
    form: {
        gap: 14,
    },
    inputGroup: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
    },
    button: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 10,
    },
    buttonContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    footer: {
        marginTop: 24,
    },
    footerText: {
        fontSize: 13,
        textAlign: "center",
    },
    footerLink: {
        fontWeight: "600",
    },
});