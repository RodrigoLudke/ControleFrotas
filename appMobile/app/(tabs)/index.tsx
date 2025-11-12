// src/screens/Home.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  MaterialCommunityIcons,
  FontAwesome5,
  Ionicons,
} from "@expo/vector-icons";
import { startTracking } from "@/services/locationService";
import { apiFetch } from "@/services/api";

/**
 * Dashboard (Home) - sincroniza com backend para exibir:
 * - Minhas Viagens (este mês)
 * - KM Rodados (soma kmFinal - kmInicial)
 * - Solicitações de manutenção pendentes (APENAS alertas)
 * - Abastecimentos este mês
 */

export default function Home() {
  const router = useRouter();
  const colorScheme = useColorScheme() as "light" | "dark";
  const theme = Colors[colorScheme];

  const [loading, setLoading] = useState(false);
  const [viagens, setViagens] = useState<any[]>([]);
  const [abastecimentos, setAbastecimentos] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[] | null>(null); // null = rota não disponível / não testada

  const [stats, setStats] = useState({
    viagensEsteMes: 0,
    kmRodados: 0,
    solicitacoesManutencaoPendentes: 0,
    abastecimentosEsteMes: 0,
  });

  useEffect(() => {
    console.log("Iniciando serviço de localização na Home...");
    startTracking();
  }, []);

  const isSameMonth = (d: Date, ref = new Date()) =>
    d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();

  const toNumberSafe = (v: any) => {
    if (v === undefined || v === null) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // fetch paralelo: viagens, abastecimentos, alertas (sem manutenções)
      const [viagensRes, abastecRes, alertasRes] = await Promise.allSettled([
        apiFetch("/viagens"),
        apiFetch("/abastecimentos"),
        apiFetch("/alertas"),
      ]);

      // viagens
      let viagensArr: any[] = [];
      if (viagensRes.status === "fulfilled" && viagensRes.value.ok) {
        try {
          viagensArr = await viagensRes.value.json();
        } catch (e) {
          viagensArr = [];
        }
      } else {
        console.warn("Falha ao buscar viagens:", viagensRes);
        viagensArr = [];
      }

      // abastecimentos
      let abastecArr: any[] = [];
      if (abastecRes.status === "fulfilled" && abastecRes.value.ok) {
        try {
          abastecArr = await abastecRes.value.json();
        } catch (e) {
          abastecArr = [];
        }
      } else {
        console.warn("Falha ao buscar abastecimentos:", abastecRes);
        abastecArr = [];
      }

      // alertas (somente para contar solicitações pendentes)
      let alertArr: any[] | null = null;
      if (alertasRes && alertasRes.status === "fulfilled") {
        if (alertasRes.value.ok) {
          try {
            alertArr = await alertasRes.value.json();
          } catch (e) {
            alertArr = [];
          }
        } else {
          console.warn(
            "Rota /alertas retornou não-ok:",
            alertasRes.value?.status,
          );
          alertArr = [];
        }
      } else {
        // rota não existe / token não permitido / erro de rede -> manter null para indicar indisponível
        console.warn(
          "Falha ao buscar alertas (rota pode não existir ou token):",
          alertasRes,
        );
        alertArr = null;
      }

      // salvar estados
      setViagens(Array.isArray(viagensArr) ? viagensArr : []);
      setAbastecimentos(Array.isArray(abastecArr) ? abastecArr : []);
      setAlertas(Array.isArray(alertArr) ? alertArr : null);

      // calcular estatísticas
      const now = new Date();

      const viagensEsteMes = (
        Array.isArray(viagensArr) ? viagensArr : []
      ).filter((v: any) => {
        if (!v?.dataSaida) return false;
        const d = new Date(v.dataSaida);
        return isSameMonth(d, now);
      }).length;

      const kmRodados = (Array.isArray(viagensArr) ? viagensArr : []).reduce(
        (acc: number, v: any) => {
          const ki = toNumberSafe(v.kmInicial);
          const kf = toNumberSafe(v.kmFinal);
          if (ki > 0 && kf >= ki) return acc + (kf - ki);
          return acc;
        },
        0,
      );

      const abastecimentosEsteMes = (
        Array.isArray(abastecArr) ? abastecArr : []
      ).filter((a: any) => {
        if (!a?.data) return false;
        const d = new Date(a.data);
        return isSameMonth(d, now);
      }).length;

      // solicitações de manutenção pendentes = alertas tipo SOLICITACAO e status PENDENTE
      let solicitacoesPendentes = 0;
      if (alertArr !== null) {
        solicitacoesPendentes = (alertArr ?? []).filter((a: any) => {
          const tipo = (a.tipo ?? "").toString().toUpperCase();
          const status = (a.status ?? "").toString().toUpperCase();
          return tipo === "SOLICITACAO" && status === "PENDENTE";
        }).length;
      } else {
        // rota /alertas indisponível -> mostra 0 (ou você pode querer sinalizar ao usuário)
        solicitacoesPendentes = 0;
      }

      setStats({
        viagensEsteMes,
        kmRodados,
        solicitacoesManutencaoPendentes: solicitacoesPendentes,
        abastecimentosEsteMes,
      });
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
      Alert.alert(
        "Erro",
        "Não foi possível carregar as estatísticas. Verifique sua conexão.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const goToRegistrarViagem = () => router.push("/(tabs)/registrar");
  const goToVerViagens = () => router.push("/(tabs)/ver-viagens");
  const goToCriarAlerta = () => router.push("/(tabs)/criar-alertas");
  const goToRegistrarAbastecimento = () =>
    router.push("/(tabs)/registrar-abastecimento");

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Menu
          </ThemedText>
          <ThemedText style={styles.subtitle}>Motoristas</ThemedText>
        </View>

        {loading ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <ActivityIndicator />
          </View>
        ) : (
          <View style={styles.grid}>
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.cardRow}>
                <View>
                  <ThemedText style={styles.cardTitle}>
                    Minhas Viagens
                  </ThemedText>
                  <ThemedText type="title" style={styles.cardNumber}>
                    {stats.viagensEsteMes}
                  </ThemedText>
                  <ThemedText style={styles.cardNote}>Este mês</ThemedText>
                </View>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={28}
                    color="#2b6cb0"
                  />
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.cardRow}>
                <View>
                  <ThemedText style={styles.cardTitle}>KM Rodados</ThemedText>
                  <ThemedText type="title" style={styles.cardNumber}>
                    {stats.kmRodados.toLocaleString()}
                  </ThemedText>
                  <ThemedText style={styles.cardNote}>Este mês</ThemedText>
                </View>
                <View style={styles.iconWrap}>
                  <FontAwesome5 name="truck" size={22} color="#f6ad55" />
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.cardRow}>
                <View>
                  <ThemedText style={styles.cardTitle}>Meus Alertas</ThemedText>
                  <ThemedText type="title" style={styles.cardNumber}>
                    {stats.solicitacoesManutencaoPendentes}
                  </ThemedText>
                  <ThemedText style={styles.cardNote}>Pendentes</ThemedText>
                </View>
                <View style={styles.iconWrap}>
                  <Ionicons name="warning-outline" size={26} color="#dd6b20" />
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.cardRow}>
                <View>
                  <ThemedText style={styles.cardTitle}>
                    Abastecimentos
                  </ThemedText>
                  <ThemedText type="title" style={styles.cardNumber}>
                    {stats.abastecimentosEsteMes}
                  </ThemedText>
                  <ThemedText style={styles.cardNote}>Este mês</ThemedText>
                </View>
                <View style={styles.iconWrap}>
                  <FontAwesome5 name="gas-pump" size={22} color="#38a169" />
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.actionsCard, { backgroundColor: theme.card }]}>
          <ThemedText style={styles.actionsTitle}>Ações Rápidas</ThemedText>
          <ThemedText style={styles.actionsSubtitle}>
            O que você deseja fazer?
          </ThemedText>

          <View style={styles.actionsRow}>
            <Pressable
              style={[styles.actionBtn, { borderColor: theme.border }]}
              onPress={goToRegistrarViagem}
            >
              <View style={styles.actionInner}>
                <MaterialCommunityIcons
                  name="map-marker-plus"
                  size={22}
                  color="#2b6cb0"
                />
                <ThemedText style={styles.actionText}>Nova Viagem</ThemedText>
                <ThemedText style={styles.actionNote}>
                  Registrar nova viagem
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, { borderColor: theme.border }]}
              onPress={goToVerViagens}
            >
              <View style={styles.actionInner}>
                <FontAwesome5 name="list" size={22} color="#f6ad55" />
                <ThemedText style={styles.actionText}>
                  Minhas Viagens
                </ThemedText>
                <ThemedText style={styles.actionNote}>
                  Ver histórico de viagens
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, { borderColor: theme.border }]}
              onPress={goToCriarAlerta}
            >
              <View style={styles.actionInner}>
                <MaterialCommunityIcons
                  name="wrench"
                  size={22}
                  color="#ed8936"
                />
                <ThemedText style={styles.actionText}>
                  Solicitar Manutenção
                </ThemedText>
                <ThemedText style={styles.actionNote}>
                  Reportar problema no veículo
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, { borderColor: theme.border }]}
              onPress={goToRegistrarAbastecimento}
            >
              <View style={styles.actionInner}>
                <FontAwesome5 name="gas-pump" size={22} color="#38a169" />
                <ThemedText style={styles.actionText}>
                  Novo Abastecimento
                </ThemedText>
                <ThemedText style={styles.actionNote}>
                  Registrar novo abastecimento
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 36, flex: 1 },
  header: { marginBottom: 20 },
  title: { fontSize: 34, fontWeight: "800", marginBottom: 6 },
  subtitle: { color: "#6b7280" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  card: { width: "48%", borderRadius: 12, padding: 16, marginBottom: 10 },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 13, color: "#6b7280" },
  cardNumber: { fontSize: 28, fontWeight: "bold", marginTop: 4 },
  cardNote: { fontSize: 12, color: "#9aa0a6" },
  iconWrap: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  actionsCard: { borderRadius: 12, padding: 16, marginTop: 10 },
  actionsTitle: { fontSize: 16, fontWeight: "bold" },
  actionsSubtitle: { fontSize: 13, color: "#6b7280", marginBottom: 10 },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  actionBtn: { padding: 12, borderWidth: 1, borderRadius: 10, width: "48%" },
  actionInner: { alignItems: "center" },
  actionText: { fontWeight: "bold", marginTop: 8 },
  actionNote: { fontSize: 12, color: "#9aa0a6" },
});
