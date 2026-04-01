using System.Diagnostics;

namespace KhaosBoxCompanion;

internal static class LocalResourceOpener
{
  public static void Open(string targetPath)
  {
    if (Directory.Exists(targetPath))
    {
      OpenFolder(targetPath);
      return;
    }

    if (File.Exists(targetPath))
    {
      OpenFile(targetPath);
      return;
    }

    throw new FileNotFoundException("The local resource does not exist.", targetPath);
  }

  private static void OpenFolder(string targetPath)
  {
    var process = Process.Start(new ProcessStartInfo
    {
      FileName = "explorer.exe",
      Arguments = $"\"{targetPath}\"",
      UseShellExecute = true,
    });

    if (process is null)
    {
      throw new InvalidOperationException("Unable to open the folder in Windows Explorer.");
    }
  }

  private static void OpenFile(string targetPath)
  {
    var startInfo = new ProcessStartInfo
    {
      FileName = targetPath,
      UseShellExecute = true,
      WorkingDirectory = Path.GetDirectoryName(targetPath) ?? string.Empty,
    };

    var process = Process.Start(startInfo);

    if (process is null)
    {
      throw new InvalidOperationException("Unable to open the file with its associated application.");
    }
  }
}
