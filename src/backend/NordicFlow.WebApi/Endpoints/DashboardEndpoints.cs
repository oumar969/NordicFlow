using System.Security.Claims;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.Dashboard;
using NordicFlow.WebApi.Security;

namespace NordicFlow.WebApi.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/v1/dashboard/snapshot", GetSnapshotAsync)
            .RequireAuthorization("dashboard:read")
            .Produces<DashboardSnapshot>();
        endpoints.MapGet("/api/v1/dashboard/summary", GetSummaryAsync)
            .RequireAuthorization("dashboard:read")
            .Produces<DashboardSummary>();
        endpoints.MapGet("/api/v1/orders/delayed", GetDelayedOrdersAsync)
            .RequireAuthorization("dashboard:read")
            .Produces<IReadOnlyCollection<DelayedOrder>>();
        endpoints.MapGet("/api/v1/inventory/status", GetInventoryAsync)
            .RequireAuthorization("dashboard:read")
            .Produces<IReadOnlyCollection<InventoryItem>>();
        endpoints.MapGet("/api/v1/predictions/delays", GetPredictionsAsync)
            .RequireAuthorization("dashboard:read")
            .Produces<IReadOnlyCollection<PredictionInsight>>();
        return endpoints;
    }

    private static async Task<IResult> GetSnapshotAsync(
        ClaimsPrincipal user,
        IDashboardQuery query,
        CancellationToken cancellationToken)
    {
        if (!user.TryGetTenantId(out var tenantId))
            return Results.Forbid();
        return Results.Ok(await query.GetSnapshotAsync(tenantId, cancellationToken));
    }

    private static async Task<IResult> GetSummaryAsync(
        ClaimsPrincipal user,
        GetDashboardSummaryHandler handler,
        CancellationToken cancellationToken)
    {
        if (!user.TryGetTenantId(out var tenantId))
            return Results.Forbid();

        return Results.Ok(await handler.HandleAsync(tenantId, cancellationToken));
    }

    private static async Task<IResult> GetDelayedOrdersAsync(
        ClaimsPrincipal user, IDashboardQuery query, CancellationToken cancellationToken)
    {
        if (!user.TryGetTenantId(out var tenantId)) return Results.Forbid();
        return Results.Ok(await query.GetDelayedOrdersAsync(tenantId, cancellationToken));
    }

    private static async Task<IResult> GetInventoryAsync(
        ClaimsPrincipal user, IDashboardQuery query, CancellationToken cancellationToken)
    {
        if (!user.TryGetTenantId(out var tenantId)) return Results.Forbid();
        return Results.Ok(await query.GetInventoryAsync(tenantId, cancellationToken));
    }

    private static async Task<IResult> GetPredictionsAsync(
        ClaimsPrincipal user, IDashboardQuery query, CancellationToken cancellationToken)
    {
        if (!user.TryGetTenantId(out var tenantId)) return Results.Forbid();
        return Results.Ok(await query.GetPredictionsAsync(tenantId, cancellationToken));
    }
}
