using System.Security.Claims;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.DataQuality;

namespace NordicFlow.WebApi.Endpoints;

public static class DataQualityEndpoints
{
    public static IEndpointRouteBuilder MapDataQualityEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/data-quality/summary", GetSummaryAsync)
            .RequireAuthorization("data-quality:read")
            .Produces<DataQualitySnapshot>();
        return endpoints;
    }

    private static async Task<IResult> GetSummaryAsync(
        ClaimsPrincipal user,
        GetDataQualitySummaryHandler handler,
        CancellationToken cancellationToken)
    {
        var tenantClaim = user.FindFirstValue("tenant_id");
        if (!Guid.TryParse(tenantClaim, out var tenantId))
            return Results.Forbid();
        return Results.Ok(await handler.HandleAsync(tenantId, cancellationToken));
    }
}
