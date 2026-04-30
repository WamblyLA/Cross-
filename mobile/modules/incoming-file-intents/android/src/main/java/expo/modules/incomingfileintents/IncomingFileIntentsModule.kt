package expo.modules.incomingfileintents

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

class IncomingFileIntentsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IncomingFileIntents")

    Events("onIncomingFileIntent")

    AsyncFunction("getInitialIncomingFileIntentAsync") {
      appContext.currentActivity?.intent?.let { intent ->
        normalizeIntent(intent)
      }
    }

    OnNewIntent { intent ->
      normalizeIntent(intent)?.let { payload ->
        sendEvent("onIncomingFileIntent", payload)
      }
    }
  }

  private fun normalizeIntent(intent: Intent): Map<String, Any?>? {
    val action = when (intent.action) {
      Intent.ACTION_VIEW -> "view"
      Intent.ACTION_SEND -> "send"
      else -> null
    } ?: return null

    val sourceUri = extractIntentUri(intent) ?: return null
    val context = appContext.reactContext ?: appContext.currentActivity?.applicationContext ?: return null
    val resolver = context.contentResolver
    val flags = intent.flags
    val canPersistReadPermission =
      flags and Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION != 0 &&
        flags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0
    val canPersistWritePermission =
      flags and Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION != 0 &&
        flags and Intent.FLAG_GRANT_WRITE_URI_PERMISSION != 0

    if (sourceUri.scheme == ContentResolver.SCHEME_CONTENT &&
      (canPersistReadPermission || canPersistWritePermission)
    ) {
      val takeFlags =
        (if (canPersistReadPermission) Intent.FLAG_GRANT_READ_URI_PERMISSION else 0) or
          (if (canPersistWritePermission) Intent.FLAG_GRANT_WRITE_URI_PERMISSION else 0)

      try {
        resolver.takePersistableUriPermission(sourceUri, takeFlags)
      } catch (_: SecurityException) {
        // some
      }
    }

    val metadata = queryMetadata(resolver, sourceUri)
    val workingUri = copyUriToCache(context, resolver, sourceUri, metadata.fileName) ?: sourceUri.toString()
    val persistedPermission = resolver.persistedUriPermissions.firstOrNull { permission ->
      permission.uri == sourceUri
    }
    val hasWritePermission =
      sourceUri.scheme == ContentResolver.SCHEME_FILE ||
        flags and Intent.FLAG_GRANT_WRITE_URI_PERMISSION != 0 ||
        persistedPermission?.isWritePermission == true

    return mapOf(
      "action" to action,
      "uri" to sourceUri.toString(),
      "workingUri" to workingUri,
      "fileName" to metadata.fileName,
      "mimeType" to (metadata.mimeType ?: intent.type),
      "size" to metadata.size?.toDouble(),
      "canPersistReadPermission" to canPersistReadPermission,
      "canPersistWritePermission" to canPersistWritePermission,
      "hasWritePermission" to hasWritePermission,
      "hasPersistedReadPermission" to (persistedPermission?.isReadPermission == true),
      "hasPersistedWritePermission" to (persistedPermission?.isWritePermission == true)
    )
  }

  private fun extractIntentUri(intent: Intent): Uri? {
    if (intent.action == Intent.ACTION_VIEW) {
      return intent.data
    }

    if (intent.action != Intent.ACTION_SEND) {
      return null
    }

    @Suppress("DEPRECATION")
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
    } else {
      intent.getParcelableExtra(Intent.EXTRA_STREAM)
    }
  }

  private fun queryMetadata(resolver: ContentResolver, uri: Uri): IncomingFileMetadata {
    var fileName: String? = null
    var size: Long? = null

    if (uri.scheme == ContentResolver.SCHEME_CONTENT) {
      resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)
        ?.use { cursor ->
          if (cursor.moveToFirst()) {
            val displayNameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)

            if (displayNameIndex >= 0) {
              fileName = cursor.getString(displayNameIndex)
            }

            if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) {
              size = cursor.getLong(sizeIndex)
            }
          }
        }
    }

    if (fileName.isNullOrBlank()) {
      fileName = uri.lastPathSegment?.substringAfterLast('/')
    }

    return IncomingFileMetadata(
      fileName = fileName,
      mimeType = resolver.getType(uri),
      size = size
    )
  }

  private fun copyUriToCache(
    context: Context,
    resolver: ContentResolver,
    uri: Uri,
    fileName: String?
  ): String? {
    val cacheDir = File(context.cacheDir, "incoming-file-intents")
    if (!cacheDir.exists()) {
      cacheDir.mkdirs()
    }

    val safeName = sanitizeFileName(fileName ?: uri.lastPathSegment ?: "incoming-file")
    val targetFile = File(cacheDir, "${System.currentTimeMillis()}-$safeName")

    return try {
      resolver.openInputStream(uri)?.use { input ->
        FileOutputStream(targetFile).use { output ->
          input.copyTo(output)
        }
      } ?: return null

      Uri.fromFile(targetFile).toString()
    } catch (_: Exception) {
      null
    }
  }

  private fun sanitizeFileName(fileName: String): String {
    return fileName.replace(Regex("[\\\\/:*?\"<>|]"), "_")
  }
}

data class IncomingFileMetadata(
  val fileName: String?,
  val mimeType: String?,
  val size: Long?
)
