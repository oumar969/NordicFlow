using Npgsql;

namespace NordicFlow.Infrastructure.Messaging;

internal sealed class PostgresOutboxStore(NpgsqlDataSource dataSource)
{
    public async Task<IReadOnlyCollection<OutboxMessage>> ClaimAsync(
        int batchSize, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            UPDATE outbox_messages
            SET locked_until = now() + interval '1 minute', attempts = attempts + 1
            WHERE id IN (
                SELECT id FROM outbox_messages
                WHERE published_at IS NULL
                  AND (locked_until IS NULL OR locked_until < now())
                ORDER BY occurred_at
                FOR UPDATE SKIP LOCKED
                LIMIT $1
            )
            RETURNING id, event_type, tenant_id, correlation_id, trace_parent, payload::text
            """);
        command.Parameters.AddWithValue(batchSize);
        var messages = new List<OutboxMessage>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            messages.Add(new(
                reader.GetGuid(0), reader.GetString(1), reader.GetGuid(2),
                reader.IsDBNull(3) ? null : reader.GetGuid(3),
                reader.IsDBNull(4) ? null : reader.GetString(4), reader.GetString(5)));
        }
        return messages;
    }

    public async Task MarkPublishedAsync(Guid id, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            UPDATE outbox_messages
            SET published_at = now(), locked_until = NULL, last_error = NULL
            WHERE id = $1
            """);
        command.Parameters.AddWithValue(id);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task MarkFailedAsync(Guid id, string error, CancellationToken cancellationToken)
    {
        await using var command = dataSource.CreateCommand("""
            UPDATE outbox_messages
            SET locked_until = now() + interval '30 seconds', last_error = left($2, 2000)
            WHERE id = $1
            """);
        command.Parameters.AddWithValue(id);
        command.Parameters.AddWithValue(error);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}

