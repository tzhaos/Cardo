using System.Diagnostics;

namespace KhaosBoxCompanion;

internal interface IFileSystemPort
{
  bool DirectoryExists(string path);
  bool FileExists(string path);
  string GetDirectoryName(string path);
}

internal interface IProcessStarter
{
  Process? Start(ProcessStartInfo startInfo);
}

internal sealed class WindowsFileSystemPort : IFileSystemPort
{
  public bool DirectoryExists(string path) => Directory.Exists(path);

  public bool FileExists(string path) => File.Exists(path);

  public string GetDirectoryName(string path) => Path.GetDirectoryName(path) ?? string.Empty;
}

internal sealed class ShellProcessStarter : IProcessStarter
{
  public Process? Start(ProcessStartInfo startInfo) => Process.Start(startInfo);
}

internal sealed class LocalResourceOpener
{
  private readonly IFileSystemPort _fileSystem;
  private readonly IProcessStarter _processStarter;

  public LocalResourceOpener()
    : this(new WindowsFileSystemPort(), new ShellProcessStarter())
  {
  }

  internal LocalResourceOpener(IFileSystemPort fileSystem, IProcessStarter processStarter)
  {
    _fileSystem = fileSystem;
    _processStarter = processStarter;
  }

  public void Open(string targetPath)
  {
    if (_fileSystem.DirectoryExists(targetPath))
    {
      OpenFolder(targetPath);
      return;
    }

    if (_fileSystem.FileExists(targetPath))
    {
      OpenFile(targetPath);
      return;
    }

    throw new FileNotFoundException("The local resource does not exist.", targetPath);
  }

  private void OpenFolder(string targetPath)
  {
    var process = _processStarter.Start(new ProcessStartInfo
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

  private void OpenFile(string targetPath)
  {
    var process = _processStarter.Start(new ProcessStartInfo
    {
      FileName = targetPath,
      UseShellExecute = true,
      WorkingDirectory = _fileSystem.GetDirectoryName(targetPath),
    });

    if (process is null)
    {
      throw new InvalidOperationException("Unable to open the file with its associated application.");
    }
  }
}
