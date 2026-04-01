using System.Windows.Forms;

namespace KhaosBoxCompanion;

internal static class CompanionDialogs
{
  private const string DialogTitle = "KhaosBox Companion";

  public static void ShowInfo(string message)
  {
    MessageBox.Show(message, DialogTitle, MessageBoxButtons.OK, MessageBoxIcon.Information);
  }

  public static void ShowError(string message)
  {
    MessageBox.Show(message, DialogTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
  }
}
