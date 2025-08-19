import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    });

    if (!loaded) {
        return null;
    }

    return (
        <ThemeProvider value={colorScheme === "light" ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
                {/* Tela inicial: login */}
                <Stack.Screen name="index" />

                {/* Abas (só acessa depois do login) */}
                <Stack.Screen name="(tabs)" />

                {/* Tela de erro */}
                <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}
