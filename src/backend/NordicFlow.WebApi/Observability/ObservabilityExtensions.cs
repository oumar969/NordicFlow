using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace NordicFlow.WebApi.Observability;

public static class ObservabilityExtensions
{
    public const string ServiceName = "NordicFlow.WebApi";

    public static WebApplicationBuilder AddNordicFlowObservability(this WebApplicationBuilder builder)
    {
        var resource = ResourceBuilder.CreateDefault()
            .AddService(ServiceName, serviceVersion: typeof(Program).Assembly.GetName().Version?.ToString())
            .AddAttributes([new("deployment.environment.name", builder.Environment.EnvironmentName)]);

        builder.Services.AddOpenTelemetry()
            .ConfigureResource(resourceBuilder => resourceBuilder.AddService(ServiceName))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(options => options.RecordException = true)
                .AddSource(ServiceName)
                .AddSource("NordicFlow.OutboxPublisher")
                .AddOtlpExporter())
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddRuntimeInstrumentation()
                .AddMeter(ServiceName)
                .AddOtlpExporter());

        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.SetResourceBuilder(resource);
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = true;
            logging.AddOtlpExporter();
        });
        return builder;
    }
}
