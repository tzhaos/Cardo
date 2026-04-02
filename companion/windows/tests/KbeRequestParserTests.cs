using Xunit;

namespace KhaosBoxCompanion.Tests;

public sealed class KbeRequestParserTests
{
  [Theory]
  [InlineData(@"kbe:V:/Shared/Chinese Folder", @"V:\Shared\Chinese Folder")]
  [InlineData(@"kbe://server/share/Docs", @"\\server\share\Docs")]
  [InlineData(@"kbe:%2F%2Fserver%2Fshare%2FDriver_Package%2Fwin_signed", @"\\server\share\Driver_Package\win_signed")]
  [InlineData(@"kbe:file:///C:/Work/Specs.pdf", @"C:\Work\Specs.pdf")]
  [InlineData(@"kbe:file://server/share/Docs", @"\\server\share\Docs")]
  public void Parse_NormalizesSupportedInputs(string rawInput, string expectedPath)
  {
    var request = KbeRequestParser.Parse(rawInput);

    Assert.Equal(expectedPath, request.TargetPath);
  }
}
