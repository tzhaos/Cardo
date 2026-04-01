namespace KhaosBoxExplorer;

internal static class KbeApplication
{
  public static int Run(string[] args)
  {
    if (args.Length >= 2 && string.Equals(args[0], "--resolve", StringComparison.OrdinalIgnoreCase))
    {
      return ResolveTarget(args[1]);
    }

    if (args.Length > 0 && IsHelpArgument(args[0]))
    {
      Console.WriteLine("Usage: KhaosBoxExplorer.exe [kbe-uri]");
      Console.WriteLine("       KhaosBoxExplorer.exe --resolve [kbe-uri]");
      return 0;
    }

    if (args.Length == 0)
    {
      KbeDialogs.ShowInfo(
        "KhaosBoxExplorer is installed as the kbe: protocol handler.\n\n" +
        "Open a kbe: link from KhaosBox or pass --resolve in a terminal to inspect a URI."
      );
      return 0;
    }

    try
    {
      var request = KbeRequestParser.Parse(args[0]);
      KbeOpener.Open(request.TargetPath);
      return 0;
    }
    catch (Exception exception)
    {
      KbeDialogs.ShowError(BuildErrorMessage(exception));
      return 1;
    }
  }

  private static int ResolveTarget(string uriOrPath)
  {
    try
    {
      var request = KbeRequestParser.Parse(uriOrPath);
      Console.WriteLine(request.TargetPath);
      return 0;
    }
    catch (Exception exception)
    {
      Console.Error.WriteLine(BuildErrorMessage(exception));
      return 1;
    }
  }

  private static string BuildErrorMessage(Exception exception)
  {
    if (exception is FileNotFoundException fileNotFoundException &&
        !string.IsNullOrWhiteSpace(fileNotFoundException.FileName))
    {
      return $"The local resource could not be found:\n{fileNotFoundException.FileName}";
    }

    return exception.Message;
  }

  private static bool IsHelpArgument(string value)
  {
    return string.Equals(value, "--help", StringComparison.OrdinalIgnoreCase) ||
           string.Equals(value, "-h", StringComparison.OrdinalIgnoreCase) ||
           string.Equals(value, "/?", StringComparison.OrdinalIgnoreCase);
  }
}
