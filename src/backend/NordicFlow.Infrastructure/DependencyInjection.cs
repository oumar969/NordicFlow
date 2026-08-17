using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NordicFlow.Application.Abstractions;
using NordicFlow.Infrastructure.Persistence;
using Npgsql;
using Azure.Identity;
using Azure.Messaging.EventHubs.Producer;
using NordicFlow.Infrastructure.Messaging;

namespace NordicFlow.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("NordicFlow")
            ?? throw new InvalidOperationException("ConnectionStrings:NordicFlow is required.");
        services.AddSingleton(_ => NpgsqlDataSource.Create(connectionString));
        services.AddScoped<IOrderRepository, PostgresOrderRepository>();
        services.AddScoped<IDashboardQuery, PostgresDashboardQuery>();
        var eventHubs = configuration.GetSection(EventHubsOptions.SectionName)
            .Get<EventHubsOptions>() ?? new EventHubsOptions();
        services.Configure<EventHubsOptions>(configuration.GetSection(EventHubsOptions.SectionName));
        if (eventHubs.Enabled)
        {
            if (string.IsNullOrWhiteSpace(eventHubs.FullyQualifiedNamespace) ||
                string.IsNullOrWhiteSpace(eventHubs.EventHubName))
                throw new InvalidOperationException("Event Hubs namespace and hub name are required when enabled.");
            services.AddSingleton(new EventHubProducerClient(
                eventHubs.FullyQualifiedNamespace,
                eventHubs.EventHubName,
                new DefaultAzureCredential()));
            services.AddSingleton<PostgresOutboxStore>();
            services.AddHostedService<EventHubsOutboxPublisher>();
        }
        return services;
    }
}
