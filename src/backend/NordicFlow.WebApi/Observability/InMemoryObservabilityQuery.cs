using System.Collections.Concurrent;
using System.Diagnostics;
using NordicFlow.Application.Abstractions;

namespace NordicFlow.WebApi.Observability;

internal sealed class InMemoryObservabilityQuery : IObservabilityQuery, IDisposable
{
    private const int Capacity = 500;
    private static readonly TimeSpan MetricsWindow = TimeSpan.FromMinutes(15);
    private readonly ConcurrentQueue<CapturedActivity> _activities = new();
    private readonly ActivityListener _listener;

    public InMemoryObservabilityQuery()
    {
        _listener = new ActivityListener
        {
            ShouldListenTo = source =>
                source.Name.StartsWith("NordicFlow", StringComparison.Ordinal) ||
                source.Name == "Microsoft.AspNetCore",
            Sample = static (ref ActivityCreationOptions<ActivityContext> _) =>
                ActivitySamplingResult.AllDataAndRecorded,
            SampleUsingParentId = static (ref ActivityCreationOptions<string> _) =>
                ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = Capture
        };
        ActivitySource.AddActivityListener(_listener);
    }

    public Task<ObservabilitySnapshot> GetAsync(
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var now = DateTimeOffset.UtcNow;
        var windowStart = now - MetricsWindow;
        var tenantActivities = _activities
            .Where(activity => activity.TenantId == tenantId && activity.StartedAt >= windowStart)
            .OrderByDescending(activity => activity.StartedAt)
            .ToArray();
        var requestActivities = tenantActivities
            .Where(activity => activity.Source == "Microsoft.AspNetCore")
            .ToArray();
        var failedRequests = requestActivities.Count(activity => activity.IsError);
        var requestErrorRate = Ratio(failedRequests, requestActivities.Length);
        var requestsLastMinute = requestActivities.Count(activity => activity.StartedAt >= now.AddMinutes(-1));
        var traces = tenantActivities
            .Where(activity => !string.IsNullOrWhiteSpace(activity.EventId) ||
                               !string.IsNullOrWhiteSpace(activity.CorrelationId))
            .Take(50)
            .Select(activity => new TraceRecord(
                activity.TraceId,
                activity.CorrelationId ?? "not-set",
                activity.EventId ?? "not-set",
                activity.Operation,
                activity.Duration.TotalMilliseconds,
                activity.IsError ? "Error" : "Success",
                activity.StartedAt))
            .ToArray();
        var services = tenantActivities
            .GroupBy(activity => activity.ServiceName, StringComparer.Ordinal)
            .Select(group => CreateServiceHealth(group.Key, group.ToArray()))
            .OrderBy(service => service.Name, StringComparer.Ordinal)
            .ToArray();

        return Task.FromResult(new ObservabilitySnapshot(
            requestsLastMinute,
            Percentile95(requestActivities.Select(activity => activity.Duration.TotalMilliseconds)),
            requestErrorRate,
            1 - requestErrorRate,
            "Connected",
            now,
            services,
            traces));
    }

    public void Dispose() => _listener.Dispose();

    private void Capture(Activity activity)
    {
        var tenantValue = GetTag(activity, "nordicflow.tenant.id");
        if (!Guid.TryParse(tenantValue, out var tenantId))
            return;

        var statusCode = GetTag(activity, "http.response.status_code") ??
                         GetTag(activity, "http.status_code");
        var isHttpError = int.TryParse(statusCode, out var parsedStatus) && parsedStatus >= 500;
        _activities.Enqueue(new CapturedActivity(
            tenantId,
            activity.Source.Name,
            GetServiceName(activity.Source.Name),
            activity.DisplayName,
            activity.TraceId.ToHexString(),
            GetTag(activity, "nordicflow.correlation.id"),
            GetTag(activity, "nordicflow.event.id") ?? GetTag(activity, "messaging.message.id"),
            activity.StartTimeUtc,
            activity.Duration,
            activity.Status == ActivityStatusCode.Error || isHttpError));

        while (_activities.Count > Capacity)
            _activities.TryDequeue(out _);
    }

    private static ServiceHealth CreateServiceHealth(
        string serviceName,
        IReadOnlyCollection<CapturedActivity> activities)
    {
        var errorRate = Ratio(activities.Count(activity => activity.IsError), activities.Count);
        var status = errorRate >= 0.05 ? "Unavailable" : errorRate >= 0.01 ? "Degraded" : "Healthy";
        return new ServiceHealth(
            serviceName,
            status,
            Percentile95(activities.Select(activity => activity.Duration.TotalMilliseconds)),
            errorRate);
    }

    private static string? GetTag(Activity activity, string name) =>
        activity.TagObjects.FirstOrDefault(tag => tag.Key == name).Value?.ToString();

    private static string GetServiceName(string sourceName) => sourceName switch
    {
        "Microsoft.AspNetCore" => "Orders API",
        "NordicFlow.OutboxPublisher" => "Outbox publisher",
        _ => sourceName
    };

    private static double Ratio(int numerator, int denominator) =>
        denominator == 0 ? 0 : (double)numerator / denominator;

    private static double Percentile95(IEnumerable<double> values)
    {
        var ordered = values.Order().ToArray();
        if (ordered.Length == 0)
            return 0;
        var index = (int)Math.Ceiling(ordered.Length * 0.95) - 1;
        return Math.Round(ordered[Math.Max(index, 0)], 2);
    }

    private sealed record CapturedActivity(
        Guid TenantId,
        string Source,
        string ServiceName,
        string Operation,
        string TraceId,
        string? CorrelationId,
        string? EventId,
        DateTimeOffset StartedAt,
        TimeSpan Duration,
        bool IsError);
}
