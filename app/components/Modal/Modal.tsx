import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ModalComponentProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

interface City {
  local_names: {
    ru: string;
  };
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

const FAVORITE_CITIES_KEY = "@weather:favorite_cities";
const SEARCH_HISTORY_KEY = "@weather:search_history";

export const ModalComponent = ({
  visible,
  setVisible,
}: ModalComponentProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentCity] = useState("Москва"); // Пример текущего города
  const [favoriteCities, setFavoriteCities] = useState<City[]>([]); // Избранные города
  const [searchHistory, setSearchHistory] = useState<string[]>([]); // История поиска
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Загрузка избранных городов из AsyncStorage
  const loadFavoriteCities = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITE_CITIES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavoriteCities(parsed);
      }
    } catch (error) {
      console.error("Ошибка загрузки избранных городов:", error);
    } finally {
      setIsLoadingFavorites(false);
    }
  }, []);

  // Сохранение избранных городов в AsyncStorage
  const saveFavoriteCities = useCallback(async (cities: City[]) => {
    try {
      await AsyncStorage.setItem(FAVORITE_CITIES_KEY, JSON.stringify(cities));
    } catch (error) {
      console.error("Ошибка сохранения избранных городов:", error);
    }
  }, []);

  // Загружаем избранные города при монтировании компонента
  useEffect(() => {
    loadFavoriteCities();
  }, [loadFavoriteCities]);

  // Сохраняем избранные города при каждом изменении
  useEffect(() => {
    if (!isLoadingFavorites) {
      saveFavoriteCities(favoriteCities);
    }
  }, [favoriteCities, saveFavoriteCities, isLoadingFavorites]);

  // Загрузка истории поиска из AsyncStorage
  const loadSearchHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSearchHistory(parsed);
      }
    } catch (error) {
      console.error("Ошибка загрузки истории поиска:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Сохранение истории поиска в AsyncStorage
  const saveSearchHistory = useCallback(async (history: string[]) => {
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Ошибка сохранения истории поиска:", error);
    }
  }, []);

  // Загружаем историю поиска при монтировании компонента
  useEffect(() => {
    loadSearchHistory();
  }, [loadSearchHistory]);

  // Сохраняем историю поиска при каждом изменении
  useEffect(() => {
    if (!isLoadingHistory) {
      saveSearchHistory(searchHistory);
    }
  }, [searchHistory, saveSearchHistory, isLoadingHistory]);

  // Проверка, находится ли город в избранном
  const isFavorite = (city: City): boolean => {
    return favoriteCities.some(
      (fav) => fav.lat === city.lat && fav.lon === city.lon
    );
  };

  // Добавление/удаление города из избранного
  const toggleFavorite = useCallback((city: City, event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    setFavoriteCities((prev) => {
      if (prev.some((fav) => fav.lat === city.lat && fav.lon === city.lon)) {
        return prev.filter(
          (fav) => !(fav.lat === city.lat && fav.lon === city.lon)
        );
      } else {
        return [...prev, city];
      }
    });
  }, []);


  const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || Constants.expoConfig?.extra?.openweatherApiKey;

  const searchCities = useCallback(async (query: string) => {
    if (!query.trim() || !API_KEY) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}&lang=ru`
      );
      if (response.ok) {
        const data = await response.json();
        const results = data.filter((item: City) => item.local_names?.ru);
        console.log(data);
        setSearchResults(results);
        console.log(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Ошибка поиска городов:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [API_KEY]);

  useEffect(() => {
    // Очищаем предыдущий таймер
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Если текст пустой, очищаем результаты
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    // Устанавливаем новый таймер для debounce (1500ms)
    searchTimeoutRef.current = setTimeout(() => {
      searchCities(searchText);
    }, 1500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, searchCities]);

  const handleSearch = (text: string) => {
    setSearchText(text);
  };

  const handleCitySelect = useCallback((city: City | string) => {
    const cityName = typeof city === "string" 
      ? city 
      : `${city.local_names?.ru || city.name}${city.state ? `, ${city.state}` : ""}, ${city.country}`;
    
    // Добавляем в историю поиска
    setSearchHistory((prev) => {
      const filtered = prev.filter((item) => item !== cityName);
      return [cityName, ...filtered].slice(0, 10); // Максимум 10 записей
    });
    setSearchText("");
    setIsFocused(false);
    setSearchResults([]);
    // Здесь можно добавить логику выбора города
    if (typeof city !== "string") {
      console.log("Выбран город:", city);
    }
  }, []);

  const handleCancel = () => {
    inputRef.current?.blur();
    setSearchText("");
    setIsFocused(false);
    setSearchResults([]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setVisible(false)}
    >
      <LinearGradient
        colors={["#C4A382", "#B86A4E"]}
        start={{ x: 0, y: 0.15 }}
        end={{ x: 1, y: 0.85 }}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top"]}>
          <View
            style={[
              styles.headerContainer,
              isFocused ? styles.headerContainerLeft : styles.headerContainerRight,
            ]}
          >
            {isFocused ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setVisible(false)}
              >
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.modalHeader}>
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Найти город"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
              value={searchText}
              onChangeText={handleSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </View>
          <ScrollView style={styles.modalContent}>
            {isFocused ? (
              // Показываем результаты поиска или историю когда инпут в фокусе
              <View>
                {searchText.trim() ? (
                  // Показываем результаты поиска
                  <>
                    {isSearching ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.loadingText}>Поиск городов...</Text>
                      </View>
                    ) : searchResults.length > 0 ? (
                      <>
                        <Text style={styles.sectionTitle}>Результаты поиска</Text>
                        {searchResults.map((city, index) => (
                          <View
                            key={`${city.lat}-${city.lon}-${index}`}
                            style={styles.cityItem}
                          >
                            <TouchableOpacity
                              style={styles.cityItemContent}
                              onPress={() => handleCitySelect(city)}
                            >
                              <Ionicons name="location-outline" size={20} color="#fff" />
                              <View style={styles.cityInfo}>
                                <Text style={styles.cityText}>
                                  {city.local_names?.ru || city.name}{city.state ? `, ${city.state}` : ""}
                                </Text>
                                <Text style={styles.countryText}>{city.country}</Text>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.favoriteButton}
                              onPress={(e) => toggleFavorite(city, e)}
                            >
                              <Ionicons
                                name={isFavorite(city) ? "star" : "star-outline"}
                                size={24}
                                color={isFavorite(city) ? "#FFD700" : "#fff"}
                              />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </>
                    ) : (
                      <Text style={styles.emptyText}>Города не найдены</Text>
                    )}
                  </>
                ) : (
                  // Показываем историю поиска когда нет текста
                  <>
                    {searchHistory.length > 0 ? (
                      <>
                        <Text style={styles.sectionTitle}>История поиска</Text>
                        {searchHistory.map((city, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.cityItem}
                            onPress={() => handleCitySelect(city)}
                          >
                            <Ionicons name="time-outline" size={20} color="#fff" />
                            <Text style={styles.cityText}>{city}</Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : (
                      <Text style={styles.emptyText}>История поиска пуста</Text>
                    )}
                  </>
                )}
              </View>
            ) : (
              // Показываем текущий город и избранные когда инпут не в фокусе
              <View>
                <View style={styles.currentCitySection}>
                  <Text style={styles.sectionTitle}>Текущий город</Text>
                  <TouchableOpacity style={styles.currentCityItem}>
                    <Ionicons name="location" size={20} color="#fff" />
                    <Text style={styles.cityText}>{currentCity}</Text>
                  </TouchableOpacity>
                </View>
                {favoriteCities.length > 0 && (
                  <View style={styles.favoritesSection}>
                    <Text style={styles.sectionTitle}>Избранные города</Text>
                    {favoriteCities.map((city, index) => (
                      <View
                        key={`${city.lat}-${city.lon}-${index}`}
                        style={styles.cityItem}
                      >
                        <TouchableOpacity
                          style={styles.cityItemContent}
                          onPress={() => handleCitySelect(city)}
                        >
                          <Ionicons name="star" size={20} color="#FFD700" />
                          <View style={styles.cityInfo}>
                            <Text style={styles.cityText}>
                              {city.local_names?.ru || city.name}{city.state ? `, ${city.state}` : ""}
                            </Text>
                            <Text style={styles.countryText}>{city.country}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.favoriteButton}
                          onPress={(e) => toggleFavorite(city, e)}
                        >
                          <Ionicons
                            name="star"
                            size={24}
                            color="#FFD700"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerContainerLeft: {
    justifyContent: "flex-start",
  },
  headerContainerRight: {
    justifyContent: "flex-end",
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 0,
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: 0.5,
    color: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 17,
    color: "#000",
    fontWeight: "500",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 20,
    marginBottom: 10,
  },
  currentCitySection: {
    marginBottom: 20,
  },
  favoritesSection: {
    marginTop: 10,
  },
  currentCityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginTop: 10,
  },
  cityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  cityItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  favoriteButton: {
    padding: 8,
    marginLeft: 8,
  },
  cityText: {
    fontSize: 18,
    color: "#fff",
    marginLeft: 12,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: 40,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 10,
  },
  cityInfo: {
    marginLeft: 12,
    flex: 1,
  },
  countryText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
    marginLeft: 12,
  },
});
