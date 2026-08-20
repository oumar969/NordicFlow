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

    public async Task<IReadOnlyCollection<DelayedOrder>> GetDelayedOrdersAsync(
        Guid tenantId, CancellationToken cancellationToken)
    {
        var result = new List<DelayedOrder>();
        await using var command = dataSource.CreateCommand("""
            SELECT o.id, o.order_number, o.requested_delivery_date,
                   p.delay_probability
            FROM orders o
            JOIN delay_predictions p ON p.order_id = o.id AND p.tenant_id = o.tenant_id
            WHERE o.tenant_id = $1 AND p.delay_probability >= 0.50
            ORDER BY p.delay_probability DESC, o.order_number
            LIMIT 100
            """);
        command.Parameters.AddWithValue(tenantId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var probability = reader.GetDecimal(3);
            result.Add(new(
                reader.GetGuid(0),
                reader.GetString(1),
                "Not available",
                "Not available",
                reader.IsDBNull(2) ? null : reader.GetFieldValue<DateOnly>(2),
                probability,
                (int)Math.Ceiling(probability * 7),
                probability >= 0.85m ? "Delayed" : probability >= 0.70m ? "At risk" : "Monitoring"));
        }
        return result;
    }

    public async Task<IReadOnlyCollection<InventoryItem>> GetInventoryAsync(
        Guid tenantId, CancellationToken cancellationToken)
    {
        var result = new List<InventoryItem>();
        await using var command = dataSource.CreateCommand("""
            SELECT sku, available_quantity, reserved_quantity, updated_at
            FROM inventory_status
            WHERE tenant_id = $1
            ORDER BY sku
            LIMIT 1000
            """);
        command.Parameters.AddWithValue(tenantId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var available = reader.GetDecimal(1);
            var reserved = reader.GetDecimal(2);
            result.Add(new(
                reader.GetString(0),
                reader.GetString(0),
                "Not assigned",
                available,
                reserved,
                reserved,
                Math.Max(reserved - available, 0),
                reader.GetFieldValue<DateTimeOffset>(3)));
        }
        return result;
    }

    public async Task<IReadOnlyCollection<PredictionInsight>> GetPredictionsAsync(
        Guid tenantId, CancellationToken cancellationToken)
    {
        var result = new List<PredictionInsight>();
        await using var command = dataSource.CreateCommand("""
            SELECT p.order_id, o.order_number, p.delay_probability,
                   p.model_version, p.scored_at
            FROM delay_predictions p
            JOIN orders o ON o.id = p.order_id AND o.tenant_id = p.tenant_id
            WHERE p.tenant_id = $1
            ORDER BY p.delay_probability DESC
            LIMIT 100
            """);
        command.Parameters.AddWithValue(tenantId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var probability = reader.GetDecimal(2);
            result.Add(new(
                reader.GetGuid(0),
                reader.GetString(1),
                probability,
                (int)Math.Ceiling(probability * 7),
                reader.GetString(3),
                reader.GetFieldValue<DateTimeOffset>(4),
                1m,
                []));
        }
        return result;
    }
}
