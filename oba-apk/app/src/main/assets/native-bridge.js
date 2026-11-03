(function () {
  if (window.__obaNativeInstalled || !window.NativeBridge) return;
  window.__obaNativeInstalled = true;

  try {
    function NativeNotification(title, options) {
      options = options || {};
      NativeBridge.showNotification(
        String(title || "OBA Tarix Nəzarəti"),
        String(options.body || ""),
        String(options.tag || "")
      );
    }
    Object.defineProperty(NativeNotification, "permission", {
      configurable: true,
      get: function () {
        try { return NativeBridge.canNotify() ? "granted" : "denied"; }
        catch (_) { return "denied"; }
      }
    });
    NativeNotification.requestPermission = function () {
      try { return Promise.resolve(NativeBridge.canNotify() ? "granted" : "denied"); }
      catch (_) { return Promise.resolve("denied"); }
    };
    window.Notification = NativeNotification;
  } catch (_) {}

  const defaults = {
    enabled: true, before3d: true, before1d: true, before3h: true, after2h: true
  };

  function readAll() {
    return new Promise(function (resolve) {
      if (!window.indexedDB) return resolve(null);
      const open = indexedDB.open("oba-tarix");
      open.onerror = function () { resolve(null); };
      open.onupgradeneeded = function () {
        try { open.transaction.abort(); } catch (_) {}
        resolve(null);
      };
      open.onsuccess = function () {
        const db = open.result;
        if (!db.objectStoreNames.contains("products") ||
            !db.objectStoreNames.contains("kv")) {
          db.close(); return resolve(null);
        }
        let products = [];
        let settings = Object.assign({}, defaults);
        let done = 0;
        const finish = function () {
          done += 1;
          if (done === 2) {
            db.close();
            resolve({ products: products, settings: settings });
          }
        };
        try {
          const tx = db.transaction("products", "readonly");
          const req = tx.objectStore("products").getAll();
          req.onsuccess = function () { products = req.result || []; };
          tx.oncomplete = finish; tx.onerror = finish; tx.onabort = finish;
        } catch (_) { finish(); }
        try {
          const tx = db.transaction("kv", "readonly");
          const req = tx.objectStore("kv").get("settings");
          req.onsuccess = function () {
            settings = Object.assign({}, defaults, req.result || {});
          };
          tx.oncomplete = finish; tx.onerror = finish; tx.onabort = finish;
        } catch (_) { finish(); }
      };
    });
  }

  let syncing = false;
  window.__obaNativeSync = async function () {
    if (syncing) return;
    syncing = true;
    try {
      const data = await readAll();
      if (data) NativeBridge.syncReminders(JSON.stringify(data));
    } catch (_) {} finally { syncing = false; }
  };

  setTimeout(window.__obaNativeSync, 2500);
  setInterval(window.__obaNativeSync, 30000);
  window.addEventListener("focus", window.__obaNativeSync);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) window.__obaNativeSync();
  });
})();
