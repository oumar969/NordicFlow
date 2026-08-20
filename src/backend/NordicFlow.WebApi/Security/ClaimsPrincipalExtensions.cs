using System.Security.Claims;

namespace NordicFlow.WebApi.Security;

internal static class ClaimsPrincipalExtensions
{
    public static bool TryGetTenantId(this ClaimsPrincipal principal, out Guid tenantId)
    {
        var value = principal.FindFirstValue("tenant_id")
            ?? principal.FindFirstValue("tid")
            ?? principal.FindFirstValue("http://schemas.microsoft.com/identity/claims/tenantid");

        return Guid.TryParse(value, out tenantId);
    }
}
