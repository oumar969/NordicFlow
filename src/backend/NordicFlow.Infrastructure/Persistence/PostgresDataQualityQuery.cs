using NordicFlow.Application.Abstractions;
using Npgsql;

namespace NordicFlow.Infrastructure.Persistence;

internal sealed class PostgresDataQualityQuery(NpgsqlDataSource dataSource) : IDataQualityQuery
{
    public async Task<DataQualitySnapshot> GetAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            WITH ranked AS (
                SELECT *, lag(error_rate) OVER (ORDER BY evaluated_at) AS previous_error_rate
                FROM data_quality_runs WHERE tenant_id = $1
            )
            SELECT id, processed_events, valid_events, quarantined_events, error_rate,
                   COALESCE(previous_error_rate, 0), contract_version, evaluated_at
            FROM ranked ORDER BY evaluated_at DESC LIMIT 1
            """);
        command.Parameters.AddWithValue(tenantId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return new DataQualitySnapshot(0, 0, 0, 0, 0, "not-available", DateTimeOffset.UtcNow, [], []);

        var runId = reader.GetGuid(0);
        var processed = reader.GetInt64(1);
        var valid = reader.GetInt64(2);
        var quarantined = reader.GetInt64(3);
        var errorRate = reader.GetDouble(4);
        var previousErrorRate = reader.GetDouble(5);
        var contractVersion = reader.GetString(6);
        var evaluatedAt = reader.GetFieldValue<DateTimeOffset>(7);
        await reader.CloseAsync();

        var lineage = await GetLineageAsync(runId, cancellationToken);
        var violations = await GetViolationsAsync(runId, cancellationToken);
        return new DataQualitySnapshot(processed, valid, quarantined, errorRate,
            previousErrorRate, contractVersion, evaluatedAt, lineage, violations);
    }

    private async Task<IReadOnlyCollection<DataLineageStage>> GetLineageAsync(
        Guid runId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT name, status, event_count, updated_at
            FROM data_lineage_stages WHERE run_id = $1 ORDER BY stage_order
            """);
        command.Parameters.AddWithValue(runId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<DataLineageStage>();
        while (await reader.ReadAsync(cancellationToken))
            result.Add(new DataLineageStage(reader.GetString(0), reader.GetString(1),
                reader.GetInt64(2), reader.GetFieldValue<DateTimeOffset>(3)));
        return result;
    }

    private async Task<IReadOnlyCollection<DataContractViolation>> GetViolationsAsync(
        Guid runId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT rule, field, violation_count, severity, latest_event_id
            FROM data_contract_violations WHERE run_id = $1
            ORDER BY violation_count DESC, rule
            """);
        command.Parameters.AddWithValue(runId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<DataContractViolation>();
        while (await reader.ReadAsync(cancellationToken))
            result.Add(new DataContractViolation(reader.GetString(0), reader.GetString(1),
                reader.GetInt64(2), reader.GetString(3), reader.GetString(4)));
        return result;
    }
}
