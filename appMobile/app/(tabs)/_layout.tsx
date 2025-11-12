// app/_layout.tsx  (ou onde estiver seu layout de tabs atual)
import { Stack } from "expo-router";
import React from "react";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function AppStackLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // @ts-ignore
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.tint,
        headerTitleAlign: "center",
        headerBackTitleVisible: false,
        headerStyle: {
          backgroundColor: theme.background, // ajusta cor do header ao tema
          // remove sombra no Android, deixamos visual limpo:
          // @ts-ignore
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      {/* Home (index) => é a tela principal, não precisa de header com voltar */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // oculta header na Home (como você tem um dashboard)
        }}
      />

      {/* Outras telas — terão automaticamente botão "voltar" no header */}
      <Stack.Screen name="registrar" options={{ title: "Registrar" }} />
      <Stack.Screen name="ver-viagens" options={{ title: "Relatório" }} />
      <Stack.Screen name="criar-alertas" options={{ title: "Alertas" }} />
      <Stack.Screen
        name="registrar-abastecimento"
        options={{ title: "Abastecimento" }}
      />
    </Stack>
  );
}
