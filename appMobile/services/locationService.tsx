import * as Location from 'expo-location';
import { apiFetch } from './api';
import { Alert } from 'react-native';

export async function requestLocationPermissions() {
    let { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
        console.error('Permissão de localização em primeiro plano negada');
        return false;
    }

    let { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
        console.error('Permissão de localização em segundo plano negada');
        return false;
    }
    return true;
}

let locationSubscription: Location.LocationSubscription | null = null;

export async function startTracking() {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
        Alert.alert("Sem permissão", "Não é possível iniciar o rastreamento sem permissão de localização.");
        return;
    }

    locationSubscription = await Location.watchPositionAsync(
        {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000, // 10 segundos
            distanceInterval: 10, // 10 metros
        },
        (location) => {
            console.log('Nova localização:', location.coords);
            // Envia para o backend
            apiFetch('/motoristas/localizacao', {
                method: 'POST',
                body: JSON.stringify({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    timestamp: location.timestamp,
                }),
            }).catch(err => console.error("Erro ao enviar localização:", err));
        }
    );
}

export function stopTracking() {
    if (locationSubscription) {
        locationSubscription.remove();
        locationSubscription = null;
    }
}