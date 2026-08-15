export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export async function getCurrentPushSubscription() {
  if (typeof window === "undefined") {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? await registration.pushManager.getSubscription() : null;
}

export async function requestPushSubscription(vapidPublicKey) {
  if (typeof window === "undefined") {
    throw new Error("Push notifications can only be enabled in the browser.");
  }

  if (!vapidPublicKey) {
    throw new Error("Missing VAPID public key.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications permission was declined.");
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const existingSubscription = await registration.pushManager.getSubscription();

  if (existingSubscription) {
    return existingSubscription;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
}
