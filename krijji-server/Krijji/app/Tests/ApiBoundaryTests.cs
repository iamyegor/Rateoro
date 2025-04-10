using System.Text.Json;
using Api.Controllers;
using Api.Utils;
using Application.Queries.GetConverterData;
using Application.Queries.GetConverterData.Models;
using MediatR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Rateoro.Tests;

public class ApiBoundaryTests
{
    [Fact]
    public async Task ConverterControllerPassesRequestedLanguageAndReturnsQueryResult()
    {
        var expected = new ConverterDto { Fiat = [new() { Code = "USD", RateToUsd = 1m }], Crypto = [] };
        var mediator = new Mock<IMediator>(MockBehavior.Strict);
        mediator.Setup(m => m.Send(It.Is<GetConverterDataQuery>(q => q.Language == "fr"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var response = await new ConverterController(mediator.Object).GetConverterData("fr");

        var ok = Assert.IsType<OkObjectResult>(response);
        Assert.Equal(StatusCodes.Status200OK, ok.StatusCode);
        Assert.Same(expected, ok.Value);
    }

    [Theory]
    [InlineData("Production", false)]
    [InlineData("Development", true)]
    public async Task MiddlewareReturnsJsonServerErrorAndRedactsProductionDetails(string environment, bool exposesDetails)
    {
        var host = new Mock<IWebHostEnvironment>();
        host.SetupGet(h => h.EnvironmentName).Returns(environment);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new ExceptionHandlingMiddleware(_ => throw new InvalidOperationException("private database detail"), host.Object);

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.Equal("application/json", context.Response.ContentType);
        context.Response.Body.Position = 0;
        using var json = await JsonDocument.ParseAsync(context.Response.Body);
        Assert.Equal("internal.server.error", json.RootElement.GetProperty("errorCode").GetString());
        var message = json.RootElement.GetProperty("errorMessage").GetString()!;
        if (exposesDetails)
            Assert.Contains("private database detail", message);
        else
            Assert.Equal("Internal server error", message);
    }

    [Fact]
    public async Task MiddlewarePreservesSuccessfulResponses()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new ExceptionHandlingMiddleware(async ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status202Accepted;
            await ctx.Response.WriteAsync("accepted");
        }, Mock.Of<IWebHostEnvironment>());

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status202Accepted, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        Assert.Equal("accepted", await new StreamReader(context.Response.Body).ReadToEndAsync());
    }
}
