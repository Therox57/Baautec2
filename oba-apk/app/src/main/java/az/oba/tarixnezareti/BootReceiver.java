package az.oba.tarixnezareti;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        SharedPreferences prefs =
                context.getSharedPreferences(ReminderScheduler.PREFS, Context.MODE_PRIVATE);
        prefs.edit().putBoolean("foreground", false).apply();
        String payload = prefs.getString("payload", null);
        if (payload != null && !payload.isEmpty()) ReminderScheduler.sync(context, payload);
    }
}
