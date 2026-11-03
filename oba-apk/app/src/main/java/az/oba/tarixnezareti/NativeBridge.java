package az.oba.tarixnezareti;

import android.content.Context;
import android.webkit.JavascriptInterface;

public final class NativeBridge {
    private final Context context;
    public NativeBridge(Context context) { this.context = context.getApplicationContext(); }

    @JavascriptInterface public boolean canNotify() {
        return NotificationHelper.canNotify(context);
    }

    @JavascriptInterface public void showNotification(String title, String body, String tag) {
        int id = ("web|" + (tag == null ? "" : tag)).hashCode() & 0x7fffffff;
        NotificationHelper.show(context,
                title == null ? "OBA Tarix Nəzarəti" : title,
                body == null ? "" : body, id);
    }

    @JavascriptInterface public void syncReminders(String payload) {
        if (payload != null && !payload.isEmpty()) ReminderScheduler.sync(context, payload);
    }
}
