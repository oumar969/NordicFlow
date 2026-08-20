using System.Security.Claims;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.Observability;
using NordicFlow.WebApi.Security;

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
        if (!user.TryGetTenantId(out var tenantId))
            return Results.Forbid();

        return Results.Ok(await handler.HandleAsync(tenantId, cancellationToken));
    }
}
