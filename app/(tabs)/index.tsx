import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function ViagensMenu() {
    const router = useRouter();
    const colorScheme = useColorScheme() as "light" | "dark";

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>
                Menu de Viagens
            </ThemedText>

            <Pressable
                style={[styles.button, { backgroundColor: Colors[colorScheme].tint }]}
                onPress={() => router.push("/(tabs)/registrar")}
            >
                <ThemedText
                    style={[styles.buttonText, { color: Colors[colorScheme].background }]}
                >
                    Registrar Viagem
                </ThemedText>
            </Pressable>
            <Pressable
                style={[styles.button, { backgroundColor: Colors[colorScheme].tint }]}
                onPress={() => router.push("/(tabs)/ver-viagens")}
            >
                <ThemedText
                    style={[styles.buttonText, { color: Colors[colorScheme].background }]}
                >
                    Ver Registros de Viagens
                </ThemedText>
            </Pressable>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
    title: { fontSize: 28, fontWeight: "bold", marginBottom: 30 },
    button: {
        width: "100%",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 15,
    },
    buttonText: { fontSize: 18, fontWeight: "600" },
});
