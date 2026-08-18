using NordicFlow.Application.Abstractions;
using Npgsql;

namespace NordicFlow.Infrastructure.Persistence;

internal sealed class PostgresOperationsQuery(NpgsqlDataSource dataSource) : IOperationsQuery
{
    public async Task<OperationsSnapshot> GetAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        var alerts = await GetAlertsAsync(tenantId, cancellationToken);
        var rules = await GetRulesAsync(tenantId, cancellationToken);
        var active = alerts.Where(alert => alert.Status != "Resolved").ToArray();
        var acknowledged = active.Count(alert => alert.Status == "Acknowledged");
        var meanAcknowledge = await GetMeanAcknowledgeAsync(tenantId, cancellationToken);
        return new OperationsSnapshot(active.LongLength,
            active.LongCount(alert => alert.Severity == "Critical"), acknowledged,
            meanAcknowledge, alerts, rules);
    }

    private async Task<IReadOnlyCollection<OperationsAlert>> GetAlertsAsync(
        Guid tenantId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT id, title, source, severity, status, current_value, threshold,
                   unit, owner, triggered_at, correlation_id
            FROM operational_alerts
            WHERE tenant_id = $1 AND status <> 'Resolved'
            ORDER BY CASE severity WHEN 'Critical' THEN 1 WHEN 'Warning' THEN 2 ELSE 3 END,
                     triggered_at DESC LIMIT 100
            """);
        command.Parameters.AddWithValue(tenantId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<OperationsAlert>();
        while (await reader.ReadAsync(cancellationToken))
            result.Add(new OperationsAlert(reader.GetGuid(0), reader.GetString(1), reader.GetString(2),
                reader.GetString(3), reader.GetString(4), reader.GetDouble(5), reader.GetDouble(6),
                reader.GetString(7), reader.IsDBNull(8) ? null : reader.GetString(8),
                reader.GetFieldValue<DateTimeOffset>(9), reader.IsDBNull(10) ? null : reader.GetString(10)));
        return result;
    }

    private async Task<IReadOnlyCollection<AlertRule>> GetRulesAsync(
        Guid tenantId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT id, name, metric, threshold, unit, evaluation_window_minutes, severity, enabled
            FROM alert_rules WHERE tenant_id = $1 ORDER BY name
            """);
        command.Parameters.AddWithValue(tenantId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<AlertRule>();
        while (await reader.ReadAsync(cancellationToken))
            result.Add(new AlertRule(reader.GetGuid(0), reader.GetString(1), reader.GetString(2),
                reader.GetDouble(3), reader.GetString(4), reader.GetInt32(5), reader.GetString(6), reader.GetBoolean(7)));
        return result;
    }

    private async Task<double> GetMeanAcknowledgeAsync(Guid tenantId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            SELECT COALESCE(avg(EXTRACT(EPOCH FROM (acknowledged_at - triggered_at)) / 60.0), 0)
            FROM operational_alerts
            WHERE tenant_id = $1 AND acknowledged_at IS NOT NULL
              AND triggered_at >= now() - interval '30 days'
            """);
        command.Parameters.AddWithValue(tenantId);
        var value = await command.ExecuteScalarAsync(cancellationToken);
        return value is null or DBNull ? 0 : Convert.ToDouble(value, System.Globalization.CultureInfo.InvariantCulture);
    }
}
