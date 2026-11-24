package click.sstymmarket.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Process;
import android.provider.MediaStore;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * SystemMarket для Android — это сайт https://sstymmarket.click, открытый в приложении.
 * Все данные (объявления, переписка, фото, голосовые) приходят с сервера через интернет,
 * поэтому изменения на сайте сразу видны в приложении без обновления APK.
 */
public class MainActivity extends Activity {
    static final String HOST = "sstymmarket.click";
    static final String HOME = "https://" + HOST + "/";
    static final String VERSION = "1.0";
    private static final int REQ_FILES = 10;
    private static final int REQ_MIC = 11;

    private FrameLayout root;
    private WebView web;
    private ProgressBar bar;
    private View offline;
    private View fullscreen;
    private WebChromeClient.CustomViewCallback fullscreenDone;
    private ValueCallback<Uri[]> filesCallback;
    private Uri cameraOutput;
    private PermissionRequest micRequest;
    private boolean pageFailed;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        root = new FrameLayout(this);

        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);      // пока сайт грузится, виден логотип
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));

        bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setVisibility(View.GONE);
        bar.setProgressTintList(ColorStateList.valueOf(0xFF0A7A3D));
        root.addView(bar, new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP));

        offline = buildOfflineScreen();
        offline.setVisibility(View.GONE);
        root.addView(offline, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                   // язык, тема, ключ браузера, избранное
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " SystemMarketApp/" + VERSION);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, false);

        web.setWebViewClient(new Client());
        web.setWebChromeClient(new Chrome());
        web.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String ua, String disposition, String mime, long length) {
                openOutside(Uri.parse(url));
            }
        });

        if (state != null) web.restoreState(state);
        if (web.getUrl() == null && !openLoginLink(getIntent())) web.loadUrl(HOME);
    }

    // ------------------------------------------------------------ экран «нет связи»

    private boolean isNight() {
        return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
    }

    private int dp(int v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private View buildOfflineScreen() {
        boolean night = isNight();
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(32), dp(32), dp(32), dp(32));
        box.setBackgroundColor(night ? 0xFF0A0C0E : 0xFFF1F2F4);
        box.setClickable(true);

        TextView title = new TextView(this);
        title.setText("Нет связи с сайтом\nBaglanyşyk ýok · Bağlantı yok");
        title.setTextColor(night ? 0xFFEEF0F3 : 0xFF0D1014);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 19);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        box.addView(title);

        TextView hint = new TextView(this);
        hint.setText("Проверьте интернет или VPN\nInternetiňizi ýa-da VPN-i barlaň");
        hint.setTextColor(night ? 0xFF9BA3AD : 0xFF59616D);
        hint.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        hint.setGravity(Gravity.CENTER);
        hint.setPadding(0, dp(10), 0, dp(22));
        box.addView(hint);

        Button retry = new Button(this);
        retry.setText("Обновить · Täzele");
        retry.setAllCaps(false);
        retry.setTextColor(Color.WHITE);
        retry.setBackgroundTintList(ColorStateList.valueOf(0xFF0A7A3D));
        retry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                pageFailed = false;
                offline.setVisibility(View.GONE);
                if (web.getUrl() == null) web.loadUrl(HOME); else web.reload();
            }
        });
        box.addView(retry, new LinearLayout.LayoutParams(-2, -2));
        return box;
    }

    private void showOffline() {
        pageFailed = true;
        offline.setVisibility(View.VISIBLE);
    }

    // ------------------------------------------------------------ ссылки

    /** true — ссылку открываем не в приложении (звонок, WhatsApp, Telegram, вход через Google). */
    private boolean route(Uri u) {
        String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
        String host = u.getHost() == null ? "" : u.getHost().toLowerCase();
        String path = u.getPath() == null ? "" : u.getPath();
        if (scheme.equals("https") || scheme.equals("http")) {
            if (host.equals(HOST) || host.equals("www." + HOST)) {
                // Google не разрешает вход внутри приложений — входим в браузере, затем браузер вернёт сюда
                if (path.startsWith("/auth/google") || path.endsWith(".apk")) {
                    openOutside(u);
                    return true;
                }
                return false;
            }
            openOutside(u);
            return true;
        }
        if (scheme.equals("about") || scheme.equals("data") || scheme.equals("blob")) return false;
        if (scheme.equals("intent")) {
            try {
                Intent i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME);
                i.addCategory(Intent.CATEGORY_BROWSABLE);
                i.setComponent(null);
                i.setSelector(null);
                startActivity(i);
            } catch (Exception ignored) {
                // приложения нет — ничего не делаем
            }
            return true;
        }
        openOutside(u);                                     // tel:, mailto:, whatsapp:, tg: …
        return true;
    }

    private void openOutside(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException ignored) {
            // нет приложения для такой ссылки
        }
    }

    /** systemmarket://login?code=… — вход через Google завершён в браузере. */
    private boolean openLoginLink(Intent intent) {
        Uri d = intent == null ? null : intent.getData();
        if (d == null || !"systemmarket".equals(d.getScheme()) || !"login".equals(d.getHost())) return false;
        String code = d.getQueryParameter("code");
        if (code == null || !code.matches("[A-Za-z0-9_-]{20,100}")) return false;
        web.loadUrl(HOME + "auth/app?code=" + code);
        return true;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openLoginLink(intent);
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return route(request.getUrl());
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return route(Uri.parse(url));
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            pageFailed = false;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (!pageFailed) offline.setVisibility(View.GONE);
            CookieManager.getInstance().flush();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) showOffline();
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView view, int code, String description, String failingUrl) {
            if (Build.VERSION.SDK_INT < 23) showOffline();
        }
    }

    // ------------------------------------------------------------ фото, видео, микрофон, полный экран

    private class Chrome extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int progress) {
            bar.setProgress(progress);
            bar.setVisibility(progress < 100 ? View.VISIBLE : View.GONE);
        }

        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filesCallback != null) filesCallback.onReceiveValue(null);
            filesCallback = callback;
            cameraOutput = null;

            List<String> types = new ArrayList<String>();
            for (String t : params.getAcceptTypes()) {
                if (t == null) continue;
                for (String x : t.split(",")) {
                    x = x.trim();
                    if (!x.isEmpty()) types.add(x);
                }
            }
            boolean images = types.isEmpty(), videos = types.isEmpty();
            for (String t : types) {
                if (t.startsWith("image/")) images = true;
                if (t.startsWith("video/")) videos = true;
            }

            Intent pick = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE);
            if (types.size() == 1) {
                pick.setType(types.get(0));
            } else {
                pick.setType("*/*");
                if (!types.isEmpty()) pick.putExtra(Intent.EXTRA_MIME_TYPES, types.toArray(new String[0]));
            }
            if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

            List<Intent> cameras = new ArrayList<Intent>();
            if (images) {
                Intent photo = photoIntent();
                if (photo != null) cameras.add(photo);
            }
            if (videos) {
                Intent video = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);
                video.putExtra(MediaStore.EXTRA_SIZE_LIMIT, 28L * 1024 * 1024);   // сайт принимает видео до 30 МБ
                video.putExtra(MediaStore.EXTRA_DURATION_LIMIT, 90);
                if (video.resolveActivity(getPackageManager()) != null) cameras.add(video);
            }
            Intent chooser = Intent.createChooser(pick, null);
            if (!cameras.isEmpty()) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, cameras.toArray(new Intent[0]));
            try {
                startActivityForResult(chooser, REQ_FILES);
            } catch (ActivityNotFoundException e) {
                filesCallback = null;
                return false;
            }
            return true;
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            Uri origin = request.getOrigin();
            boolean ours = origin != null && HOST.equals(origin.getHost());
            boolean audio = false;
            for (String r : request.getResources()) {
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) audio = true;
            }
            if (!ours || !audio) {
                request.deny();
                return;
            }
            if (hasMicPermission()) {
                request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                return;
            }
            if (micRequest != null) micRequest.deny();
            micRequest = request;
            if (Build.VERSION.SDK_INT >= 23) {
                requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
            } else {
                micRequest.deny();
                micRequest = null;
            }
        }

        @Override
        public void onPermissionRequestCanceled(PermissionRequest request) {
            if (request == micRequest) micRequest = null;
        }

        @Override
        public void onShowCustomView(View view, CustomViewCallback callback) {
            if (fullscreen != null) {
                callback.onCustomViewHidden();
                return;
            }
            fullscreen = view;
            fullscreenDone = callback;
            root.addView(view, new FrameLayout.LayoutParams(-1, -1));
            web.setVisibility(View.INVISIBLE);
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }

        @Override
        public void onHideCustomView() {
            exitFullscreen();
        }
    }

    private Intent photoIntent() {
        Intent cam = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (cam.resolveActivity(getPackageManager()) == null) return null;
        File dir = new File(getCacheDir(), "camera");
        if (!dir.isDirectory() && !dir.mkdirs()) return null;
        File[] old = dir.listFiles();                       // прошлые снимки уже отправлены
        if (old != null) for (File f : old) f.delete();
        cameraOutput = Uri.parse("content://" + CameraFiles.AUTHORITY + "/photo_" + System.currentTimeMillis() + ".jpg");
        cam.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutput);
        cam.setClipData(ClipData.newRawUri("", cameraOutput));
        cam.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return cam;
    }

    private boolean cameraPhotoTaken() {
        if (cameraOutput == null) return false;
        File f = new File(new File(getCacheDir(), "camera"), cameraOutput.getLastPathSegment());
        return f.length() > 0;
    }

    @Override
    protected void onActivityResult(int code, int result, Intent data) {
        if (code != REQ_FILES) {
            super.onActivityResult(code, result, data);
            return;
        }
        if (filesCallback == null) return;
        Uri[] picked = null;
        if (result == RESULT_OK) {
            ClipData clip = data == null ? null : data.getClipData();
            if (clip != null && clip.getItemCount() > 0) {
                picked = new Uri[clip.getItemCount()];
                for (int i = 0; i < picked.length; i++) picked[i] = clip.getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) {
                picked = new Uri[]{data.getData()};
            } else if (cameraPhotoTaken()) {
                picked = new Uri[]{cameraOutput};
            }
        }
        filesCallback.onReceiveValue(picked);
        filesCallback = null;
    }

    private boolean hasMicPermission() {
        return checkPermission(Manifest.permission.RECORD_AUDIO, Process.myPid(), Process.myUid())
                == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        if (code != REQ_MIC || micRequest == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) {
            micRequest.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
        } else {
            micRequest.deny();
        }
        micRequest = null;
    }

    private void exitFullscreen() {
        if (fullscreen == null) return;
        root.removeView(fullscreen);
        fullscreen = null;
        web.setVisibility(View.VISIBLE);
        getWindow().getDecorView().setSystemUiVisibility(0);
        if (fullscreenDone != null) {
            fullscreenDone.onCustomViewHidden();
            fullscreenDone = null;
        }
    }

    // ------------------------------------------------------------ кнопка «Назад» и жизненный цикл

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (fullscreen != null) {
            exitFullscreen();
        } else if (web.canGoBack()) {
            offline.setVisibility(View.GONE);
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            root.removeView(web);
            web.destroy();
        }
        super.onDestroy();
    }
}
