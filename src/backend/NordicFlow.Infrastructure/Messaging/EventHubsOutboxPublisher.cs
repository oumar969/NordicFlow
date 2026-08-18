using System.Diagnostics;
using Azure.Messaging.EventHubs;
using Azure.Messaging.EventHubs.Producer;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace NordicFlow.Infrastructure.Messaging;

internal sealed class EventHubsOutboxPublisher(
    PostgresOutboxStore store,
    EventHubProducerClient producer,
    IOptions<EventHubsOptions> options,
    ILogger<EventHubsOutboxPublisher> logger) : BackgroundService
{
    private static readonly ActivitySource ActivitySource = new("NordicFlow.OutboxPublisher");
    private readonly EventHubsOptions _options = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(_options.PollIntervalSeconds));
        do
        {
            try
            {
                var messages = await store.ClaimAsync(_options.BatchSize, stoppingToken);
                foreach (var message in messages)
                    await PublishAsync(message, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Outbox polling failed; delivery will be retried.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task PublishAsync(OutboxMessage message, CancellationToken cancellationToken)
    {
        using var activity = ActivitySource.StartActivity("eventhubs.publish", ActivityKind.Producer);
        activity?.SetTag("messaging.system", "azure_event_hubs");
        activity?.SetTag("messaging.message.id", message.Id);
        activity?.SetTag("nordicflow.correlation.id", message.CorrelationId);
        activity?.SetTag("nordicflow.tenant.id", message.TenantId.ToString());

        var eventData = new EventData(BinaryData.FromString(message.Payload));
        eventData.Properties["eventId"] = message.Id.ToString();
        eventData.Properties["eventType"] = message.EventType;
        eventData.Properties["tenantId"] = message.TenantId.ToString();
        if (message.CorrelationId is not null)
            eventData.Properties["correlationId"] = message.CorrelationId.Value.ToString();
        if (message.TraceParent is not null)
            eventData.Properties["traceparent"] = message.TraceParent;
        if (activity?.Id is not null)
            eventData.Properties["publishTraceparent"] = activity.Id;

        try
        {
            await producer.SendAsync(
                [eventData],
                new SendEventOptions { PartitionKey = message.TenantId.ToString() },
                cancellationToken);
            await store.MarkPublishedAsync(message.Id, cancellationToken);
            logger.LogInformation("Published outbox event {EventId} to Event Hubs.", message.Id);
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            activity?.SetStatus(ActivityStatusCode.Error, exception.Message);
            await store.MarkFailedAsync(message.Id, exception.Message, cancellationToken);
            logger.LogWarning(exception, "Event {EventId} was not published and will be retried.", message.Id);
        }
    }
}
