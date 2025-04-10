using Application.Queries.GetConverterData.Models;
using Domain.Crypto;
using Domain.Fiat;
using Domain.UpdateTimestamp;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Rateoro.Tests;

public class ConverterQueryTests
{
    // This exercises query composition and mapping only. PostgreSQL constraints,
    // SQL translation and transactions require separate PostgreSQL integration tests.
    private sealed class IsolatedContext : ApplicationContext
    {
        private readonly string _databaseName = Guid.NewGuid().ToString();
        protected override void OnConfiguring(DbContextOptionsBuilder options) =>
            options.UseInMemoryDatabase(_databaseName);
    }

    [Theory]
    [InlineData("fr", "Dollar américain")]
    [InlineData("unsupported", null)]
    public async Task ConverterReturnsLocalizedFiatCryptoAndIndependentUpdateDates(string language, string? name)
    {
        await using var context = new IsolatedContext();
        var fiatUpdate = UpdateTimestamp.CreateFiat();
        var cryptoUpdate = UpdateTimestamp.CreateCrypto();
        context.Fiats.Add(new Fiat("USD", [new CurrencyName("Stored name", "en")], 1m));
        context.Cryptos.AddRange(new Crypto("BTC", "Bitcoin", 12345.6789m), new Crypto("XYZ", null, 0.0001m));
        context.UpdateTimestamps.AddRange(fiatUpdate, cryptoUpdate);
        var fiatDate = new DateTime(2024, 10, 7, 9, 0, 0, DateTimeKind.Utc);
        var cryptoDate = new DateTime(2024, 10, 7, 10, 30, 0, DateTimeKind.Utc);
        context.Entry(fiatUpdate).Property(t => t.LastUpdate).CurrentValue = fiatDate;
        context.Entry(cryptoUpdate).Property(t => t.LastUpdate).CurrentValue = cryptoDate;
        await context.SaveChangesAsync();
        context.ChangeTracker.Clear();

        var result = await new GetConverterDataQueryHandler(context)
            .Handle(new GetConverterDataQuery(language), CancellationToken.None);

        var fiat = Assert.Single(result.Fiat);
        Assert.Equal("USD", fiat.Code);
        Assert.Equal(name, fiat.Name);
        Assert.Equal(1m, fiat.RateToUsd);
        Assert.Equal(2, result.Crypto.Count);
        var bitcoin = Assert.Single(result.Crypto, c => c.Code == "BTC");
        Assert.Equal("Bitcoin", bitcoin.Name);
        Assert.Equal(12345.6789m, bitcoin.RateToUsd);
        var unknown = Assert.Single(result.Crypto, c => c.Code == "XYZ");
        Assert.Null(unknown.Name);
        Assert.Equal(0.0001m, unknown.RateToUsd);
        Assert.Equal(fiatDate, result.FiatLastUpdateDate);
        Assert.Equal(cryptoDate, result.CryptoLastUpdateDate);
    }

    [Fact]
    public async Task ConverterReturnsEmptyListsWhenNoCurrenciesHaveBeenLoaded()
    {
        await using var context = new IsolatedContext();
        context.UpdateTimestamps.AddRange(UpdateTimestamp.CreateFiat(), UpdateTimestamp.CreateCrypto());
        await context.SaveChangesAsync();

        var result = await new GetConverterDataQueryHandler(context)
            .Handle(new GetConverterDataQuery("en"), CancellationToken.None);

        Assert.Empty(result.Fiat);
        Assert.Empty(result.Crypto);
    }

    [Fact]
    public async Task ConverterFailsWhenRequiredRefreshTimestampIsMissing()
    {
        await using var context = new IsolatedContext();
        context.UpdateTimestamps.Add(UpdateTimestamp.CreateFiat());
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new GetConverterDataQueryHandler(context)
                .Handle(new GetConverterDataQuery("en"), CancellationToken.None));
    }
}
