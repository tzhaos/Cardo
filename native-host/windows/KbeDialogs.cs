using System.Windows.Forms;

namespace KhaosBoxExplorer;

internal static class KbeDialogs
{
  private const string DialogTitle = "KhaosBoxExplorer";

  public static void ShowInfo(string message)
  {
    MessageBox.Show(message, DialogTitle, MessageBoxButtons.OK, MessageBoxIcon.Information);
  }

  public static void ShowError(string message)
  {
    MessageBox.Show(message, DialogTitle, MessageBoxButtons.OK, MessageBoxIcon.Error);
  }
}
