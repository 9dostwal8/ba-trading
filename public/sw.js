/* OfferDent service worker: web push + notification clicks. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let p = {};
  try {
    p = event.data ? event.data.json() : {};
  } catch {
    p = { title: event.data ? event.data.text() : "" };
  }

  const title = p.title || "OfferDent";
  const options = {
    body: p.body || "",
    icon: p.icon || "/favicon.ico",
    badge: "/favicon.ico",
    dir: p.dir || "rtl",
    lang: p.lang || "ar",
    tag: p.tag || undefined,
    renotify: !!p.tag,
    data: { link: p.link || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) {
            try {
              await c.navigate(link);
            } catch {
              /* cross-origin or blocked: ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(link);
    })(),
  );
});
