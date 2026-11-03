package az.oba.tarixnezareti;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.MimeTypeMap;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int REQ_NOTIFICATIONS = 201;
    private static final int REQ_CAMERA = 202;
    private static final int REQ_FILE = 203;
    private static final String LOCAL_HOST = "app.local";

    private WebView webView;
    private PermissionRequest pendingCameraRequest;
    private ValueCallback<Uri[]> fileCallback;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        NotificationHelper.ensureChannel(this);
        requestNotificationPermission();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        setContentView(webView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);

        webView.addJavascriptInterface(new NativeBridge(this), "NativeBridge");
        webView.setWebViewClient(new LocalClient());
        webView.setWebChromeClient(new NativeChromeClient());
        WebView.setWebContentsDebuggingEnabled(false);
        webView.loadUrl("https://" + LOCAL_HOST + "/index.html");
    }

    @Override protected void onResume() {
        super.onResume();
        getSharedPreferences(ReminderScheduler.PREFS, MODE_PRIVATE)
                .edit().putBoolean("foreground", true).apply();
        if (webView != null) webView.postDelayed(() ->
                webView.evaluateJavascript(
                        "window.__obaNativeSync && window.__obaNativeSync();", null), 1200L);
    }

    @Override protected void onPause() {
        if (webView != null) webView.evaluateJavascript(
                "window.__obaNativeSync && window.__obaNativeSync();", null);
        getSharedPreferences(ReminderScheduler.PREFS, MODE_PRIVATE)
                .edit().putBoolean("foreground", false).apply();
        super.onPause();
    }

    @Override protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("NativeBridge");
            webView.destroy();
        }
        super.onDestroy();
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
        }
    }

    private void injectNativeBridgeScript() {
        try (InputStream in = getAssets().open("native-bridge.js")) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int n;
            while ((n = in.read(buffer)) >= 0) out.write(buffer, 0, n);
            webView.evaluateJavascript(out.toString(StandardCharsets.UTF_8.name()), null);
        } catch (Exception ignored) {}
    }

    private WebResourceResponse assetResponse(String rawPath) {
        try {
            String path = rawPath == null ? "/" : rawPath;
            if (path.startsWith("/")) path = path.substring(1);
            if (path.isEmpty()) path = "index.html";
            if (path.contains("..")) return null;
            try {
                return responseFor(path, getAssets().open("www/" + path));
            } catch (Exception missing) {
                if (!path.contains("."))
                    return responseFor("index.html", getAssets().open("www/index.html"));
            }
        } catch (Exception ignored) {}
        return null;
    }

    private WebResourceResponse responseFor(String path, InputStream in) {
        String mime = MimeTypeMap.getSingleton()
                .getMimeTypeFromExtension(MimeTypeMap.getFileExtensionFromUrl(path));
        if (mime == null) {
            if (path.endsWith(".js")) mime = "application/javascript";
            else if (path.endsWith(".json")) mime = "application/json";
            else if (path.endsWith(".svg")) mime = "image/svg+xml";
            else if (path.endsWith(".woff2")) mime = "font/woff2";
            else mime = "text/html";
        }
        String encoding = mime.startsWith("text/") || mime.contains("javascript")
                || mime.contains("json") || mime.contains("svg") ? "UTF-8" : null;
        return new WebResourceResponse(mime, encoding, in);
    }

    private final class LocalClient extends WebViewClient {
        @Override public WebResourceResponse shouldInterceptRequest(
                WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (LOCAL_HOST.equalsIgnoreCase(uri.getHost())) {
                WebResourceResponse local = assetResponse(uri.getPath());
                if (local != null) return local;
            }
            return super.shouldInterceptRequest(view, request);
        }

        @Override public boolean shouldOverrideUrlLoading(
                WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (LOCAL_HOST.equalsIgnoreCase(uri.getHost())) return false;
            String scheme = uri.getScheme();
            if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); return true; }
                catch (Exception ignored) {}
            }
            return false;
        }

        @Override public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            injectNativeBridgeScript();
        }
    }

    private final class NativeChromeClient extends WebChromeClient {
        @Override public void onPermissionRequest(PermissionRequest request) {
            boolean wantsCamera = false;
            for (String resource : request.getResources()) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                    wantsCamera = true; break;
                }
            }
            if (!wantsCamera) { request.deny(); return; }
            if (checkSelfPermission(Manifest.permission.CAMERA)
                    == PackageManager.PERMISSION_GRANTED) {
                request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else {
                pendingCameraRequest = request;
                requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
            }
        }

        @Override public boolean onShowFileChooser(
                WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = callback;
            try {
                startActivityForResult(params.createIntent(), REQ_FILE);
                return true;
            } catch (Exception e) {
                fileCallback = null;
                return false;
            }
        }
    }

    @Override public void onRequestPermissionsResult(
            int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA && pendingCameraRequest != null) {
            if (grantResults.length > 0 &&
                    grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingCameraRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else pendingCameraRequest.deny();
            pendingCameraRequest = null;
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQ_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }
}
