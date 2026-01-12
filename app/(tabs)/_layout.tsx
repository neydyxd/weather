import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#FEE3BC", "#F39876"]}
        start={{ x: 0, y: 0.15 }}
        end={{ x: 1, y: 0.85 }}
        style={styles.gradient}
      >
        <Tabs
          screenOptions={{
            headerShown: false,
            sceneStyle: {
              backgroundColor: 'transparent',
            },
            tabBarStyle: {
              display: 'none',
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
            }}
          />
        </Tabs>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
});
