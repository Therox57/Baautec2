package az.oba.tarixnezareti;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        SharedPreferences prefs =
                context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE);
        if (prefs.getBoolean("foreground", false)) return;
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        int code = intent.getIntExtra("code", 1);
        NotificationHelper.show(context,
                title == null ? "OBA Tarix Nəzarəti" : title,
                body == null ? "Məhsulun son istifadə tarixini yoxlayın." : body,
                code);
    }
}
