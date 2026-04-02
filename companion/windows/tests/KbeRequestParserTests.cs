using System.Text.Json;
using Xunit;

namespace KhaosBoxCompanion.Tests;

public sealed class KbeRequestParserTests
{
  private static readonly KbeFixtureDocument Fixtures = LoadFixtures();

  [Theory]
  [MemberData(nameof(GetParseCases))]
  public void Parse_NormalizesSupportedInputs(string rawInput, string expectedPath)
  {
    var request = KbeRequestParser.Parse(rawInput);

    Assert.Equal(expectedPath, request.TargetPath);
  }

  public static TheoryData<string, string> GetParseCases()
  {
    var data = new TheoryData<string, string>();

    foreach (var fixture in Fixtures.ParseCases)
    {
      data.Add(fixture.RawInput, fixture.ExpectedPath);
    }

    return data;
  }

  private static KbeFixtureDocument LoadFixtures()
  {
    var fixturePath = Path.Combine(AppContext.BaseDirectory, "fixtures.json");
    var json = File.ReadAllText(fixturePath);

    return JsonSerializer.Deserialize<KbeFixtureDocument>(
             json,
             new JsonSerializerOptions
             {
               PropertyNameCaseInsensitive = true,
             }
           )
           ?? throw new InvalidOperationException("Unable to load KBE fixtures.");
  }

  private sealed class KbeFixtureDocument
  {
    public List<KbeParseFixture> ParseCases { get; set; } = [];
  }

  private sealed class KbeParseFixture
  {
    public string RawInput { get; set; } = string.Empty;

    public string ExpectedPath { get; set; } = string.Empty;
  }
}
