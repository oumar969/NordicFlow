package com.nordicflow.kafka;

import com.azure.core.credential.AccessToken;
import com.azure.core.credential.TokenRequestContext;
import com.azure.identity.DefaultAzureCredential;
import com.azure.identity.DefaultAzureCredentialBuilder;
import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.security.auth.callback.Callback;
import javax.security.auth.callback.UnsupportedCallbackException;
import javax.security.auth.login.AppConfigurationEntry;
import org.apache.kafka.common.security.auth.AuthenticateCallbackHandler;
import org.apache.kafka.common.security.oauthbearer.OAuthBearerToken;
import org.apache.kafka.common.security.oauthbearer.OAuthBearerTokenCallback;

public final class AzureIdentityCallbackHandler implements AuthenticateCallbackHandler {
    private DefaultAzureCredential credential;
    private String scope = "https://eventhubs.azure.net/.default";

    @Override
    public void configure(
            Map<String, ?> configs,
            String saslMechanism,
            List<AppConfigurationEntry> jaasConfigEntries) {
        credential = new DefaultAzureCredentialBuilder().build();
        if (!jaasConfigEntries.isEmpty()) {
            Object configuredScope = jaasConfigEntries.get(0).getOptions().get("scope");
            if (configuredScope != null) scope = configuredScope.toString();
        }
    }

    @Override
    public void handle(Callback[] callbacks) throws IOException, UnsupportedCallbackException {
        for (Callback callback : callbacks) {
            if (!(callback instanceof OAuthBearerTokenCallback tokenCallback)) {
                throw new UnsupportedCallbackException(callback);
            }
            AccessToken accessToken = credential
                    .getToken(new TokenRequestContext().addScopes(scope))
                    .block();
            if (accessToken == null) throw new IOException("Azure Identity returned no access token");
            tokenCallback.token(new AzureOAuthBearerToken(accessToken, scope));
        }
    }

    @Override
    public void close() {
        credential = null;
    }

    private record AzureOAuthBearerToken(AccessToken token, String scope) implements OAuthBearerToken {
        @Override public String value() { return token.getToken(); }
        @Override public Set<String> scope() { return Collections.singleton(scope); }
        @Override public long lifetimeMs() { return token.getExpiresAt().toInstant().toEpochMilli(); }
        @Override public String principalName() { return "azure-workload-identity"; }
        @Override public Long startTimeMs() { return Instant.now().toEpochMilli(); }
    }
}

