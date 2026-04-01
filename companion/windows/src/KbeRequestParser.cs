namespace KhaosBoxCompanion;

internal static class KbeRequestParser
{
  private const string KbePrefix = "kbe:";

  public static KbeRequest Parse(string rawInput)
  {
    var trimmedInput = TrimWrappingQuotes(rawInput.Trim());

    if (string.IsNullOrWhiteSpace(trimmedInput))
    {
      throw new ArgumentException("Missing local resource path.");
    }

    return new KbeRequest(trimmedInput, NormalizeInput(trimmedInput));
  }

  private static string NormalizeInput(string value)
  {
    if (value.StartsWith(KbePrefix, StringComparison.OrdinalIgnoreCase))
    {
      return NormalizeKbePayload(value[KbePrefix.Length..]);
    }

    if (value.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
    {
      return NormalizeFileUri(value);
    }

    return NormalizeWindowsPath(value);
  }

  private static string NormalizeKbePayload(string payload)
  {
    var trimmedPayload = TrimWrappingQuotes(payload.Trim());

    if (string.IsNullOrWhiteSpace(trimmedPayload))
    {
      throw new ArgumentException("The kbe URI does not contain a target path.");
    }

    var decodedPayload = Uri.UnescapeDataString(trimmedPayload);

    if (decodedPayload.StartsWith("file:", StringComparison.OrdinalIgnoreCase))
    {
      return NormalizeFileUri(decodedPayload);
    }

    if ((decodedPayload.StartsWith("\\", StringComparison.Ordinal) ||
         decodedPayload.StartsWith("/", StringComparison.Ordinal)) &&
        decodedPayload.Length > 1 &&
        LooksLikeDrivePath(decodedPayload[1..]))
    {
      return NormalizeWindowsPath(decodedPayload[1..]);
    }

    if (decodedPayload.StartsWith(@"\\", StringComparison.Ordinal) ||
        decodedPayload.StartsWith("//", StringComparison.Ordinal))
    {
      return NormalizeUncPath(decodedPayload);
    }

    if ((decodedPayload.StartsWith("\\", StringComparison.Ordinal) ||
         decodedPayload.StartsWith("/", StringComparison.Ordinal)) &&
        !LooksLikeDrivePath(decodedPayload))
    {
      return NormalizeUncPath(decodedPayload);
    }

    return NormalizeWindowsPath(decodedPayload);
  }

  private static string NormalizeFileUri(string fileUri)
  {
    if (!Uri.TryCreate(fileUri, UriKind.Absolute, out var parsedUri) ||
        !string.Equals(parsedUri.Scheme, Uri.UriSchemeFile, StringComparison.OrdinalIgnoreCase))
    {
      throw new ArgumentException($"Unsupported file URI: {fileUri}");
    }

    var decodedPath = Uri.UnescapeDataString(parsedUri.AbsolutePath);

    if (!string.IsNullOrWhiteSpace(parsedUri.Host))
    {
      return TrimTrailingSeparators($@"\\{parsedUri.Host}{decodedPath.Replace('/', '\\')}");
    }

    var windowsPath = decodedPath.Replace('/', '\\');

    if ((windowsPath.StartsWith("\\", StringComparison.Ordinal) ||
         windowsPath.StartsWith("/", StringComparison.Ordinal)) &&
        windowsPath.Length > 2 &&
        char.IsLetter(windowsPath[1]) &&
        windowsPath[2] == ':')
    {
      windowsPath = windowsPath[1..];
    }

    return NormalizeWindowsPath(windowsPath);
  }

  private static string NormalizeUncPath(string value)
  {
    var windowsPath = value.Replace('/', '\\');

    if (!windowsPath.StartsWith(@"\\", StringComparison.Ordinal))
    {
      windowsPath = $@"\\{windowsPath.TrimStart('\\')}";
    }

    return TrimTrailingSeparators(windowsPath);
  }

  private static string NormalizeWindowsPath(string value)
  {
    var windowsPath = value.Replace('/', '\\');

    if (!LooksLikeDrivePath(windowsPath))
    {
      throw new ArgumentException($"Unsupported local path: {value}");
    }

    if ((windowsPath.StartsWith("\\", StringComparison.Ordinal) ||
         windowsPath.StartsWith("/", StringComparison.Ordinal)) &&
        windowsPath.Length > 2 &&
        char.IsLetter(windowsPath[1]) &&
        windowsPath[2] == ':')
    {
      windowsPath = windowsPath[1..];
    }

    return TrimTrailingSeparators(windowsPath);
  }

  private static bool LooksLikeDrivePath(string value)
  {
    var candidate = value.TrimStart('\\', '/');

    return candidate.Length > 2 &&
           char.IsLetter(candidate[0]) &&
           candidate[1] == ':' &&
           (candidate[2] == '\\' || candidate[2] == '/');
  }

  private static string TrimTrailingSeparators(string path)
  {
    if (path.Length == 3 && char.IsLetter(path[0]) && path[1] == ':' && path[2] == '\\')
    {
      return path;
    }

    return path.TrimEnd('\\');
  }

  private static string TrimWrappingQuotes(string value)
  {
    if (value.Length >= 2 &&
        ((value[0] == '"' && value[^1] == '"') || (value[0] == '\'' && value[^1] == '\'')))
    {
      return value[1..^1];
    }

    return value;
  }
}
