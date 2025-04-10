using Domain.Common.Preconditions;
using Domain.Crypto;
using Domain.Currency.ValueObjects;
using Domain.Fiat;
using Xunit;

namespace Rateoro.Tests;

public class CurrencyTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void CurrenciesRejectMissingCodes(string? code)
    {
        Assert.Throws<PreconditionException>(() => new Crypto(code!, null, 1m));
        Assert.Throws<PreconditionException>(() => new Fiat(code!, [], 1m));
    }

    [Fact]
    public void FiatRejectsDuplicateLanguageNames()
    {
        var names = new List<CurrencyName> { new("Dollar", "en"), new("Other dollar", "en") };
        Assert.Throws<PreconditionException>(() => new Fiat("USD", names, 1m));
    }

    [Theory]
    [InlineData("en", "United States Dollar")]
    [InlineData("fr", "Dollar américain")]
    [InlineData("ru", "Доллар США")]
    public void FiatNamesSelectTheRequestedTranslation(string language, string name)
    {
        Assert.Equal(name, FiatNames.GetName("USD", language));
    }

    [Theory]
    [InlineData("UNKNOWN", "en")]
    [InlineData("USD", "unsupported")]
    public void FiatNamesReturnNoNameForUnsupportedCodesOrLanguages(string code, string language)
    {
        Assert.Null(FiatNames.GetName(code, language));
    }
}
