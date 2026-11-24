package click.sstymmarket.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Временный файл для снимка с камеры: приложение «Камера» записывает фото сюда,
 * а сайт затем загружает его как обычный файл. Провайдер закрыт для других
 * приложений — доступ выдаётся только на конкретный снимок.
 */
public class CameraFiles extends ContentProvider {
    static final String AUTHORITY = "click.sstymmarket.app.camera";

    @Override
    public boolean onCreate() {
        return true;
    }

    private File file(Uri uri) {
        String name = uri.getLastPathSegment();
        if (name == null || !name.matches("photo_[0-9]+\\.jpg") || getContext() == null) return null;
        File dir = new File(getContext().getCacheDir(), "camera");
        if (!dir.isDirectory()) dir.mkdirs();
        return new File(dir, name);
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File f = file(uri);
        if (f == null) throw new FileNotFoundException(String.valueOf(uri));
        int m = mode.contains("w")
                ? ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE
                : ParcelFileDescriptor.MODE_READ_ONLY;
        return ParcelFileDescriptor.open(f, m);
    }

    @Override
    public String getType(Uri uri) {
        return "image/jpeg";
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] args, String order) {
        File f = file(uri);
        if (f == null) return null;
        String[] cols = projection != null ? projection : new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        Object[] row = new Object[cols.length];
        for (int i = 0; i < cols.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(cols[i])) row[i] = f.getName();
            else if (OpenableColumns.SIZE.equals(cols[i])) row[i] = f.length();
        }
        MatrixCursor c = new MatrixCursor(cols, 1);
        c.addRow(row);
        return c;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] args) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] args) {
        return 0;
    }
}
