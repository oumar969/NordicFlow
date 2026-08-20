using NordicFlow.Application.Orders;
using NordicFlow.Application.Dashboard;
using NordicFlow.Application.Observability;
using NordicFlow.Application.Abstractions;
using NordicFlow.Application.DataQuality;
using NordicFlow.Application.Operations;
using NordicFlow.Infrastructure;
using NordicFlow.WebApi.Endpoints;
using NordicFlow.WebApi.Observability;
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);
builder.AddNordicFlowObservability();
builder.Services.AddProblemDetails();
builder.Services.AddScoped<IngestOrderCreatedHandler>();
builder.Services.AddScoped<GetDashboardSummaryHandler>();
builder.Services.AddScoped<GetObservabilitySummaryHandler>();
builder.Services.AddScoped<GetDataQualitySummaryHandler>();
builder.Services.AddScoped<GetOperationsSummaryHandler>();
builder.Services.AddSingleton<InMemoryObservabilityQuery>();
builder.Services.AddSingleton<IObservabilityQuery>(services =>
    services.GetRequiredService<InMemoryObservabilityQuery>());
builder.Services.AddInfrastructure(builder.Configuration);
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddPolicy("Dashboard", policy =>
{
    if (allowedOrigins.Length > 0)
    {
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    }
}));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Authentication:Authority"];
        options.Audience = builder.Configuration["Authentication:Audience"];
        options.RequireHttpsMetadata = true;
        options.IncludeErrorDetails = builder.Environment.IsDevelopment();
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                var logger = context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger("NordicFlow.Authentication");
                logger.LogWarning(context.Exception, "Access-token validation failed.");
                return Task.CompletedTask;
            }
        };
    });
static bool HasScope(System.Security.Claims.ClaimsPrincipal user, string requiredScope) =>
    user.Claims
        .Where(claim => claim.Type is "scp" or "scope" or "http://schemas.microsoft.com/identity/claims/scope")
        .SelectMany(claim => claim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        .Contains(requiredScope, StringComparer.Ordinal);

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("orders:write", policy => policy.RequireAssertion(context => HasScope(context.User, "orders:write")))
    .AddPolicy("dashboard:read", policy => policy.RequireAssertion(context => HasScope(context.User, "dashboard:read")))
    .AddPolicy("observability:read", policy => policy.RequireAssertion(context => HasScope(context.User, "observability:read")))
    .AddPolicy("data-quality:read", policy => policy.RequireAssertion(context => HasScope(context.User, "data-quality:read")))
    .AddPolicy("operations:read", policy => policy.RequireAssertion(context => HasScope(context.User, "operations:read")));

var app = builder.Build();
app.UseExceptionHandler();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("Dashboard");
app.UseAuthentication();
app.UseAuthorization();
app.MapOrderEndpoints();
app.MapDashboardEndpoints();
app.MapObservabilityEndpoints();
app.MapDataQualityEndpoints();
app.MapOperationsEndpoints();
app.Run();

public partial class Program;
