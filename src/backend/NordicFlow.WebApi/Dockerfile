FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish NordicFlow.WebApi/NordicFlow.WebApi.csproj -c Release -o /app --no-self-contained

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
USER app
COPY --from=build /app .
EXPOSE 8080
ENTRYPOINT ["dotnet", "NordicFlow.WebApi.dll"]

