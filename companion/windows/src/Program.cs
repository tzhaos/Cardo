using System.Windows.Forms;

namespace KhaosBoxCompanion;

internal static class Program
{
  [STAThread]
  private static int Main(string[] args)
  {
    ApplicationConfiguration.Initialize();
    return CompanionApplication.Run(args);
  }
}
