namespace NordicFlow.Infrastructure.Messaging;

public sealed class EventHubsOptions
{
    public const string SectionName = "EventHubs";
    public bool Enabled { get; init; }
    public string FullyQualifiedNamespace { get; init; } = string.Empty;
    public string EventHubName { get; init; } = string.Empty;
    public int BatchSize { get; init; } = 50;
    public int PollIntervalSeconds { get; init; } = 2;
}

