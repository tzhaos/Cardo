using System.Windows.Forms;

namespace KhaosBoxExplorer;

internal static class Program
{
  [STAThread]
  private static int Main(string[] args)
  {
    ApplicationConfiguration.Initialize();
    return KbeApplication.Run(args);
  }
}
