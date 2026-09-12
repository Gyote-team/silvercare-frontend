const KEY = "silvercare.hasAccount";

export function rememberAccount() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(KEY, "1");
}

export function hasRememberedAccount() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(KEY) === "1";
}
