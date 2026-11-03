package az.oba.tarixnezareti;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Set;

public final class ReminderScheduler {
    public static final String PREFS = "oba_native";
    private static final long HOUR = 60L * 60L * 1000L;
    private static final long DAY = 24L * HOUR;
    private static final long TWO_HOURS = 2L * HOUR;
    private ReminderScheduler() {}

    public static synchronized void sync(Context source, String payload) {
        Context context = source.getApplicationContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString("payload", payload).apply();
        cancelExisting(context, prefs);

        try {
            JSONObject root = new JSONObject(payload);
            JSONObject settings = root.optJSONObject("settings");
            if (settings == null || !settings.optBoolean("enabled", true)) {
                prefs.edit().putStringSet("scheduled_codes", new HashSet<>()).apply();
                return;
            }
            boolean before3d = settings.optBoolean("before3d", true);
            boolean before1d = settings.optBoolean("before1d", true);
            boolean before3h = settings.optBoolean("before3h", true);
            boolean after2h = settings.optBoolean("after2h", true);
            JSONArray products = root.optJSONArray("products");
            if (products == null) return;

            long now = System.currentTimeMillis();
            Set<String> codes = new HashSet<>();

            for (int i = 0; i < products.length(); i++) {
                JSONObject p = products.optJSONObject(i);
                if (p == null || !p.isNull("removedAt")) continue;

                String id = p.optString("id", "");
                String name = p.optString("name", "Məhsul");
                int quantity = p.optInt("quantity", 1);
                long expiry = p.optLong("expiresAt", 0L);
                if (id.isEmpty() || expiry <= 0L) continue;

                Set<String> sent = new HashSet<>();
                JSONArray sentArray = p.optJSONArray("sentReminders");
                if (sentArray != null) {
                    for (int s = 0; s < sentArray.length(); s++)
                        sent.add(sentArray.optString(s, ""));
                }

                String label = name + " (" + quantity + " əd.)";
                long left = expiry - now;

                if (left > 0) {
                    if (before3h && left <= 3L * HOUR && !sent.contains("3h")) {
                        scheduleOne(context, id, "3h", now + 1500L, "3 saat qalıb",
                                label + " 3 saat ərzində vaxtı bitir.", codes);
                    } else if (before1d && left <= DAY && !sent.contains("1d")) {
                        scheduleOne(context, id, "1d", now + 1500L, "1 gün qalıb",
                                label + " sabah vaxtı bitir.", codes);
                        if (before3h && !sent.contains("3h"))
                            scheduleFuture(context, id, "3h", expiry - 3L * HOUR,
                                    "3 saat qalıb", label + " 3 saat ərzində vaxtı bitir.", now, codes);
                    } else if (before3d && left <= 3L * DAY && !sent.contains("3d")) {
                        scheduleOne(context, id, "3d", now + 1500L, "3 gün qalıb",
                                label + " 3 gün ərzində vaxtı bitir.", codes);
                        if (before1d && !sent.contains("1d"))
                            scheduleFuture(context, id, "1d", expiry - DAY,
                                    "1 gün qalıb", label + " sabah vaxtı bitir.", now, codes);
                        if (before3h && !sent.contains("3h"))
                            scheduleFuture(context, id, "3h", expiry - 3L * HOUR,
                                    "3 saat qalıb", label + " 3 saat ərzində vaxtı bitir.", now, codes);
                    } else {
                        if (before3d && !sent.contains("3d"))
                            scheduleFuture(context, id, "3d", expiry - 3L * DAY,
                                    "3 gün qalıb", label + " 3 gün ərzində vaxtı bitir.", now, codes);
                        if (before1d && !sent.contains("1d"))
                            scheduleFuture(context, id, "1d", expiry - DAY,
                                    "1 gün qalıb", label + " sabah vaxtı bitir.", now, codes);
                        if (before3h && !sent.contains("3h"))
                            scheduleFuture(context, id, "3h", expiry - 3L * HOUR,
                                    "3 saat qalıb", label + " 3 saat ərzində vaxtı bitir.", now, codes);
                    }
                }

                if (after2h) scheduleExpiryRepeating(context, id, expiry, label, now, codes);
            }
            prefs.edit().putStringSet("scheduled_codes", codes).apply();
        } catch (Exception ignored) {}
    }

    private static void scheduleFuture(Context c, String id, String key, long when,
                                       String title, String body, long now, Set<String> codes) {
        if (when > now) scheduleOne(c, id, key, when, title, body, codes);
    }

    private static void scheduleOne(Context context, String id, String key, long when,
                                    String title, String body, Set<String> codes) {
        int code = requestCode(id, key);
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = pending(context, code, title, body);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        else alarm.set(AlarmManager.RTC_WAKEUP, when, pi);
        codes.add(String.valueOf(code));
    }

    private static void scheduleExpiryRepeating(Context context, String id, long expiry,
                                                String label, long now, Set<String> codes) {
        long first = expiry > now ? expiry
                : expiry + (((now - expiry) / TWO_HOURS) + 1L) * TWO_HOURS;
        int code = requestCode(id, "after");
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = pending(context, code, "Vaxtı keçib!",
                label + " vaxtı bitib. Rəfdən yığışdırın.");
        alarm.setInexactRepeating(AlarmManager.RTC_WAKEUP, first, TWO_HOURS, pi);
        codes.add(String.valueOf(code));
    }

    private static PendingIntent pending(Context context, int code, String title, String body) {
        Intent intent = new Intent(context, ReminderReceiver.class);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        intent.putExtra("code", code);
        return PendingIntent.getBroadcast(context, code, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static int requestCode(String id, String key) {
        return (id + "|" + key).hashCode() & 0x7fffffff;
    }

    private static void cancelExisting(Context context, SharedPreferences prefs) {
        Set<String> existing = prefs.getStringSet("scheduled_codes", null);
        if (existing == null) return;
        AlarmManager alarm = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        for (String raw : new HashSet<>(existing)) {
            try {
                int code = Integer.parseInt(raw);
                Intent intent = new Intent(context, ReminderReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(context, code, intent,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
                if (pi != null) { alarm.cancel(pi); pi.cancel(); }
            } catch (Exception ignored) {}
        }
        prefs.edit().remove("scheduled_codes").apply();
    }
}
