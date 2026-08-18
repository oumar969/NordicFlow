using System.Security.Claims;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.Observability;

namespace NordicFlow.WebApi.Endpoints;

public static class ObservabilityEndpoints
{
    public static IEndpointRouteBuilder MapObservabilityEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/observability/summary", GetSummaryAsync)
            .RequireAuthorization("observability:read")
            .Produces<ObservabilitySnapshot>();
        return endpoints;
    }

    private static async Task<IResult> GetSummaryAsync(
        ClaimsPrincipal user,
        GetObservabilitySummaryHandler handler,
        CancellationToken cancellationToken)
    {
        var tenantClaim = user.FindFirstValue("tenant_id");
        if (!Guid.TryParse(tenantClaim, out var tenantId))
            return Results.Forbid();

        return Results.Ok(await handler.HandleAsync(tenantId, cancellationToken));
    }
}
