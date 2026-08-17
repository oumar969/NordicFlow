using NordicFlow.Application.Abstractions;
using NordicFlow.Domain.Orders;
using Npgsql;
using System.Text.Json;

namespace NordicFlow.Infrastructure.Persistence;

internal sealed class PostgresOrderRepository(NpgsqlDataSource dataSource) : IOrderRepository
{
    public async Task<bool> EventExistsAsync(Guid eventId, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand(
            "SELECT EXISTS (SELECT 1 FROM processed_events WHERE event_id = $1)");
        command.Parameters.AddWithValue(eventId);
        return (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
    }

    public async Task AddAsync(
        Order order,
        OrderCreatedIntegrationEvent integrationEvent,
        CancellationToken cancellationToken)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var orderCommand = connection.CreateCommand())
        {
            orderCommand.Transaction = transaction;
            orderCommand.CommandText = """
                INSERT INTO orders
                    (id, tenant_id, order_number, customer_id, currency, total_amount_minor,
                     requested_delivery_date, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """;
            orderCommand.Parameters.AddWithValue(order.Id);
            orderCommand.Parameters.AddWithValue(order.TenantId);
            orderCommand.Parameters.AddWithValue(order.OrderNumber);
            orderCommand.Parameters.AddWithValue(order.CustomerId);
            orderCommand.Parameters.AddWithValue(order.Currency);
            orderCommand.Parameters.AddWithValue(order.TotalAmountMinor);
            orderCommand.Parameters.AddWithValue((object?)order.RequestedDeliveryDate ?? DBNull.Value);
            orderCommand.Parameters.AddWithValue(order.CreatedAt);
            await orderCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        foreach (var line in order.Lines)
        {
            await using var lineCommand = connection.CreateCommand();
            lineCommand.Transaction = transaction;
            lineCommand.CommandText = """
                INSERT INTO order_lines (order_id, line_number, sku, quantity, unit_price_minor)
                VALUES ($1, $2, $3, $4, $5)
                """;
            lineCommand.Parameters.AddWithValue(order.Id);
            lineCommand.Parameters.AddWithValue(line.LineNumber);
            lineCommand.Parameters.AddWithValue(line.Sku);
            lineCommand.Parameters.AddWithValue(line.Quantity);
            lineCommand.Parameters.AddWithValue(line.UnitPriceMinor);
            await lineCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var eventCommand = connection.CreateCommand())
        {
            eventCommand.Transaction = transaction;
            eventCommand.CommandText =
                "INSERT INTO processed_events (event_id, order_id) VALUES ($1, $2)";
            eventCommand.Parameters.AddWithValue(integrationEvent.EventId);
            eventCommand.Parameters.AddWithValue(order.Id);
            await eventCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await using (var outboxCommand = connection.CreateCommand())
        {
            outboxCommand.Transaction = transaction;
            outboxCommand.CommandText = """
                INSERT INTO outbox_messages
                    (id, event_type, tenant_id, correlation_id, trace_parent, payload)
                VALUES ($1, $2, $3, $4, $5, $6::jsonb)
                """;
            outboxCommand.Parameters.AddWithValue(integrationEvent.EventId);
            outboxCommand.Parameters.AddWithValue(integrationEvent.EventType);
            outboxCommand.Parameters.AddWithValue(integrationEvent.TenantId);
            outboxCommand.Parameters.AddWithValue((object?)integrationEvent.CorrelationId ?? DBNull.Value);
            outboxCommand.Parameters.AddWithValue((object?)integrationEvent.TraceParent ?? DBNull.Value);
            outboxCommand.Parameters.AddWithValue(JsonSerializer.Serialize(
                integrationEvent,
                new JsonSerializerOptions(JsonSerializerDefaults.Web)));
            await outboxCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
    }
}
