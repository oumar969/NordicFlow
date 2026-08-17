using NordicFlow.Application.Abstractions;
using Npgsql;

namespace NordicFlow.Infrastructure.Persistence;

internal sealed class PostgresDashboardQuery(NpgsqlDataSource dataSource) : IDashboardQuery
{
    public async Task<DashboardSnapshot> GetSnapshotAsync(
        Guid tenantId, CancellationToken cancellationToken)
    {
        var predictions = new List<DelayPrediction>();
        var inventory = new List<InventoryStatus>();
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);

        await using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                SELECT order_id, order_number, delay_probability, scored_at
                FROM dashboard_delay_predictions WHERE tenant_id = $1
                ORDER BY delay_probability DESC LIMIT 100
                """;
            command.Parameters.AddWithValue(tenantId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                predictions.Add(new(reader.GetGuid(0), reader.GetString(1),
                    reader.GetDecimal(2), reader.GetFieldValue<DateTimeOffset>(3)));
        }

        await using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                SELECT sku, available_quantity, reserved_quantity, updated_at
                FROM dashboard_inventory_status WHERE tenant_id = $1
                ORDER BY sku LIMIT 1000
                """;
            command.Parameters.AddWithValue(tenantId);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                inventory.Add(new(reader.GetString(0), reader.GetDecimal(1),
                    reader.GetDecimal(2), reader.GetFieldValue<DateTimeOffset>(3)));
        }
        return new(predictions, inventory);
    }
}

