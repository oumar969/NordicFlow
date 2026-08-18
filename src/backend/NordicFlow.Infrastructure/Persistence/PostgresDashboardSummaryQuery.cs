using NordicFlow.Application.Abstractions;
using Npgsql;

namespace NordicFlow.Infrastructure.Persistence;

internal sealed class PostgresDashboardSummaryQuery(NpgsqlDataSource dataSource)
    : IDashboardSummaryQuery
{
    public async Task<DashboardSummary> GetAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT
                (SELECT count(*) FROM orders WHERE tenant_id = $1),
                (SELECT count(*) FROM delay_predictions
                    WHERE tenant_id = $1 AND delay_probability >= 0.70),
                (SELECT count(*) FROM inventory_status
                    WHERE tenant_id = $1 AND available_quantity <= reserved_quantity),
                (SELECT COALESCE(avg(delay_probability), 0)
                    FROM delay_predictions WHERE tenant_id = $1),
                (SELECT max(updated_at) FROM (
                    SELECT max(created_at) AS updated_at FROM orders WHERE tenant_id = $1
                    UNION ALL
                    SELECT max(scored_at) FROM delay_predictions WHERE tenant_id = $1
                    UNION ALL
                    SELECT max(updated_at) FROM inventory_status WHERE tenant_id = $1
                ) updates)
            """);
        command.Parameters.AddWithValue(tenantId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            throw new InvalidOperationException("Dashboard summary query returned no row.");

        return new DashboardSummary(
            reader.GetInt64(0),
            reader.GetInt64(1),
            reader.GetInt64(2),
            reader.GetDecimal(3),
            reader.IsDBNull(4) ? null : reader.GetFieldValue<DateTimeOffset>(4));
    }
}
