// VerViagens.tsx
import React, { useCallback, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  FlatList,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
  Text,
  Alert,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { apiFetch } from "@/services/api";
import {
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";

export default function VerViagens() {
  const [viagens, setViagens] = useState<any[]>([]);
  const [veiculosMap, setVeiculosMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const colorScheme = useColorScheme() as "light" | "dark";
  const theme = Colors[colorScheme];
  const navigation = useNavigation();

  const fetchAll = async () => {
    try {
      setLoading(true);
      const respV = await apiFetch("/viagens");
      if (!respV.ok) throw new Error("Erro ao buscar viagens");
      const dataViagens = await respV.json();

      // buscar veículos para mapear id->placa
      let map: Record<string, string> = {};
      try {
        const respVeic = await apiFetch("/veiculos");
        if (respVeic.ok) {
          const listaVeic = await respVeic.json();
          if (Array.isArray(listaVeic)) {
            map = listaVeic.reduce((acc: Record<string, string>, v: any) => {
              const id = String(v.id ?? v.veiculoId ?? "");
              const label = v.placa || v.modelo || `Veículo ${v.id}`;
              if (id) acc[id] = label;
              return acc;
            }, {});
          }
        }
      } catch (err) {
        // fallback silencioso
        console.warn("Falha ao carregar veículos:", err);
      }

      setViagens(Array.isArray(dataViagens) ? dataViagens : []);
      setVeiculosMap(map);
    } catch (err) {
      console.error("Erro ao carregar viagens:", err);
      setViagens([]);
      setVeiculosMap({});
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, []),
  );

  const handleEdit = (id: number) => {
    // navega para a tela de registrar viagem em modo edição
    // @ts-expect-error
    navigation.navigate("registrar" as never, { id } as never);
  };

  const handleDelete = (id: number) => {
    Alert.alert("Confirmar", "Deseja realmente deletar esta viagem?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Deletar",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await apiFetch(`/viagens/${id}`, { method: "DELETE" });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              Alert.alert(
                "Erro",
                err.error || "Não foi possível deletar a viagem.",
              );
              return;
            }
            // remover localmente sem recarregar a lista inteira
            setViagens((prev) => prev.filter((v) => v.id !== id));
            Alert.alert("Sucesso", "Viagem deletada.");
          } catch (err) {
            console.error("Erro ao deletar viagem:", err);
            Alert.alert("Erro", "Não foi possível deletar a viagem.");
          }
        },
      },
    ]);
  };

  const totalViagens = viagens.length;
  const totalKm = viagens.reduce((acc, v) => {
    if (v.kmFinal != null && v.kmInicial != null)
      return acc + Math.max(0, Number(v.kmFinal) - Number(v.kmInicial));
    if (v.kmFinal != null) return acc + Number(v.kmFinal || 0);
    return acc;
  }, 0);

  const renderViagem = ({ item }: { item: any }) => {
    const saida = item.dataSaida ? new Date(item.dataSaida) : null;
    const chegada = item.dataChegada ? new Date(item.dataChegada) : null;
    const veiculoId = item.veiculoId ?? item.veiculo?.id ?? "";
    const veiculoLabel = veiculoId
      ? `${veiculoId} - ${veiculosMap[String(veiculoId)] ?? item.placa ?? item.veiculo?.placa ?? "Veículo"}`
      : (item.placa ?? "Veículo");

    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FontAwesome5 name="truck" size={18} color="#2b6cb0" />
            <ThemedText style={styles.cardTitle}>{veiculoLabel}</ThemedText>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => handleEdit(item.id)}
              hitSlop={8}
              style={{ padding: 6 }}
            >
              <Feather name="edit-3" size={18} color="#0ea5a2" />
            </Pressable>
            <Pressable
              onPress={() => handleDelete(item.id)}
              hitSlop={8}
              style={{ padding: 6 }}
            >
              <Feather name="trash-2" size={18} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>Saída</ThemedText>
            <ThemedText style={styles.value}>
              {saida
                ? `${saida.toLocaleDateString("pt-BR")} • ${saida.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "-"}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>Chegada</ThemedText>
            <ThemedText style={styles.value}>
              {chegada
                ? `${chegada.toLocaleDateString("pt-BR")} • ${chegada.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "-"}
            </ThemedText>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>Finalidade</ThemedText>
            <ThemedText style={styles.value}>
              {item.finalidade ?? "-"}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>KM Final</ThemedText>
            <ThemedText style={styles.value}>
              {item.kmFinal != null ? String(item.kmFinal) : "-"}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          <MaterialCommunityIcons name="map-marker" size={28} /> Minhas Viagens
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Histórico das suas viagens
        </ThemedText>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="map-marker"
              size={22}
              color="#38a169"
            />
            <ThemedText style={styles.summaryNumber}>{totalViagens}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Suas Viagens</ThemedText>
          </View>

          <View style={styles.summaryItem}>
            <FontAwesome5 name="truck" size={22} color="#2b6cb0" />
            <ThemedText style={styles.summaryNumber}>
              {totalKm.toLocaleString()}
            </ThemedText>
            <ThemedText style={styles.summaryLabel}>KM Percorridos</ThemedText>
          </View>
        </View>
      </View>

      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={viagens}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderViagem}
          contentContainerStyle={{
            padding: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 40 : 20,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={() => (
            <View style={{ padding: 20 }}>
              <ThemedText>Nenhuma viagem registrada.</ThemedText>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20 },
  title: { fontSize: 32, fontWeight: "800" },
  subtitle: { color: "#6b7280" },
  summaryCard: {
    marginTop: 8,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryNumber: { fontWeight: "700", fontSize: 18, marginTop: 4 },
  summaryLabel: { color: "#6b7280", marginTop: 2 },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontWeight: "800", fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  label: { color: "#6b7280", fontSize: 13 },
  value: { fontWeight: "700", fontSize: 14, marginTop: 2 },
});
