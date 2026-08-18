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
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Authentication:Authority"];
        options.Audience = builder.Configuration["Authentication:Audience"];
        options.RequireHttpsMetadata = true;
    });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("orders:write", policy => policy.RequireClaim("scope", "orders:write"))
    .AddPolicy("dashboard:read", policy => policy.RequireClaim("scope", "dashboard:read"));
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("observability:read", policy => policy.RequireClaim("scope", "observability:read"));
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("data-quality:read", policy => policy.RequireClaim("scope", "data-quality:read"))
    .AddPolicy("operations:read", policy => policy.RequireClaim("scope", "operations:read"));

var app = builder.Build();
app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapOrderEndpoints();
app.MapDashboardEndpoints();
app.MapObservabilityEndpoints();
app.MapDataQualityEndpoints();
app.MapOperationsEndpoints();
app.Run();

public partial class Program;
