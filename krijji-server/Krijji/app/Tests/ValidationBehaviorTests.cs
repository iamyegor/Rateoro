using Application.Behaviors;
using Domain.DomainErrors;
using FluentValidation;
using MediatR;
using XResults;
using Xunit;

namespace Rateoro.Tests;

public class ValidationBehaviorTests
{
    public record ValidatedRequest(string Code) : IRequest<SuccessOr<Error>>;

    private static InlineValidator<ValidatedRequest> Validator()
    {
        var validator = new InlineValidator<ValidatedRequest>();
        validator.RuleFor(r => r.Code).NotEmpty().WithMessage(new Error("currency.code.required").Serialize());
        return validator;
    }

    [Fact]
    public async Task InvalidRequestReturnsDomainErrorWithoutRunningHandler()
    {
        var behavior = new ValidationBehavior<ValidatedRequest, SuccessOr<Error>>(Validator());
        var handlerRan = false;

        var result = await behavior.Handle(new ValidatedRequest(""), _ =>
        {
            handlerRan = true;
            return Task.FromResult<SuccessOr<Error>>(Result.Fail(new Error("handler.failure")));
        }, CancellationToken.None);

        Assert.False(handlerRan);
        Assert.True(result.IsFailure);
        Assert.Equal("currency.code.required", result.Error.Code);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ValidRequestReachesHandlerAndPreservesItsResult(bool hasValidator)
    {
        var behavior = new ValidationBehavior<ValidatedRequest, SuccessOr<Error>>(hasValidator ? Validator() : null);
        var handlerRan = false;

        var result = await behavior.Handle(new ValidatedRequest("USD"), _ =>
        {
            handlerRan = true;
            return Task.FromResult<SuccessOr<Error>>(Result.Fail(new Error("handler.failure")));
        }, CancellationToken.None);

        Assert.True(handlerRan);
        Assert.True(result.IsFailure);
        Assert.Equal("handler.failure", result.Error.Code);
    }
}
