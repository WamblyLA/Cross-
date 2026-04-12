import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "crossplusplus.mobile.token";
let memoryToken: string | null = null;

export async function readSessionToken() {
  if (memoryToken) {
    return memoryToken;
  }

  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    memoryToken = token;
    return token;
  } catch {
    return memoryToken;
  }
}

export async function writeSessionToken(token: string) {
  memoryToken = token;

  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    return;
  }
}

export async function clearSessionToken() {
  memoryToken = null;

  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    return;
  }
}
