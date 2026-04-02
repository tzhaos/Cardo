using System.Diagnostics;
using Xunit;

namespace KhaosBoxCompanion.Tests;

public sealed class LocalResourceOpenerTests
{
  [Fact]
  public void Open_UsesExplorerForFolders()
  {
    var processStarter = new RecordingProcessStarter();
    var opener = new LocalResourceOpener(
      new FakeFileSystem(directoryExists: true, fileExists: false),
      processStarter
    );

    opener.Open(@"C:\Workspace");

    Assert.NotNull(processStarter.LastStartInfo);
    Assert.Equal("explorer.exe", processStarter.LastStartInfo!.FileName);
    Assert.Equal("\"C:\\Workspace\"", processStarter.LastStartInfo.Arguments);
  }

  [Fact]
  public void Open_UsesTargetFileForFiles()
  {
    var processStarter = new RecordingProcessStarter();
    var opener = new LocalResourceOpener(
      new FakeFileSystem(directoryExists: false, fileExists: true, directoryName: @"C:\Docs"),
      processStarter
    );

    opener.Open(@"C:\Docs\report.txt");

    Assert.NotNull(processStarter.LastStartInfo);
    Assert.Equal(@"C:\Docs\report.txt", processStarter.LastStartInfo!.FileName);
    Assert.Equal(@"C:\Docs", processStarter.LastStartInfo.WorkingDirectory);
  }

  [Fact]
  public void Open_ThrowsWhenPathDoesNotExist()
  {
    var opener = new LocalResourceOpener(
      new FakeFileSystem(directoryExists: false, fileExists: false),
      new RecordingProcessStarter()
    );

    var exception = Assert.Throws<FileNotFoundException>(() => opener.Open(@"C:\Missing"));

    Assert.Equal(@"C:\Missing", exception.FileName);
  }

  private sealed class FakeFileSystem : IFileSystemPort
  {
    private readonly bool _directoryExists;
    private readonly bool _fileExists;
    private readonly string _directoryName;

    public FakeFileSystem(bool directoryExists, bool fileExists, string directoryName = @"C:\Docs")
    {
      _directoryExists = directoryExists;
      _fileExists = fileExists;
      _directoryName = directoryName;
    }

    public bool DirectoryExists(string path) => _directoryExists;

    public bool FileExists(string path) => _fileExists;

    public string GetDirectoryName(string path) => _directoryName;
  }

  private sealed class RecordingProcessStarter : IProcessStarter
  {
    public ProcessStartInfo? LastStartInfo { get; private set; }

    public Process? Start(ProcessStartInfo startInfo)
    {
      LastStartInfo = startInfo;
      return Process.GetCurrentProcess();
    }
  }
}
