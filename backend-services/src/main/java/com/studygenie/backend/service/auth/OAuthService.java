package com.studygenie.backend.service.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studygenie.backend.dto.auth.AuthResponse;
import com.studygenie.backend.dto.auth.OAuthLoginRequest;
import com.studygenie.backend.dto.auth.OAuthProviderInfo;
import com.studygenie.backend.exception.BadRequestException;
import com.studygenie.backend.exception.UnauthorizedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class OAuthService {

    private static final Logger log = LoggerFactory.getLogger(OAuthService.class);

    private final String googleClientId;
    private final String googleClientSecret;
    private final String microsoftClientId;
    private final String microsoftClientSecret;
    private final String microsoftTenantId;

    private final UserAccountStore userStore;
    private final AuthService authService;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OAuthService(
            @Value("${oauth.google.client-id:}") String googleClientId,
            @Value("${oauth.google.client-secret:}") String googleClientSecret,
            @Value("${oauth.microsoft.client-id:}") String microsoftClientId,
            @Value("${oauth.microsoft.client-secret:}") String microsoftClientSecret,
            @Value("${oauth.microsoft.tenant-id:common}") String microsoftTenantId,
            UserAccountStore userStore,
            AuthService authService,
            ObjectMapper objectMapper) {
        this.googleClientId = googleClientId != null ? googleClientId.trim() : "";
        this.googleClientSecret = googleClientSecret != null ? googleClientSecret.trim() : "";
        this.microsoftClientId = microsoftClientId != null ? microsoftClientId.trim() : "";
        this.microsoftClientSecret = microsoftClientSecret != null ? microsoftClientSecret.trim() : "";
        this.microsoftTenantId = (microsoftTenantId != null && !microsoftTenantId.isBlank()) ? microsoftTenantId.trim() : "common";
        this.userStore = userStore;
        this.authService = authService;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public OAuthProviderInfo getProviderInfo(String redirectUri) {
        String encodedRedirect = redirectUri != null ? URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) : "";

        String googleUrl = "";
        if (!googleClientId.isEmpty()) {
            googleUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
                    "client_id=" + URLEncoder.encode(googleClientId, StandardCharsets.UTF_8) +
                    "&redirect_uri=" + encodedRedirect +
                    "&response_type=code" +
                    "&scope=" + URLEncoder.encode("openid email profile", StandardCharsets.UTF_8) +
                    "&access_type=offline&prompt=select_account";
        }

        String msUrl = "";
        if (!microsoftClientId.isEmpty()) {
            msUrl = "https://login.microsoftonline.com/" + microsoftTenantId + "/oauth2/v2.0/authorize?" +
                    "client_id=" + URLEncoder.encode(microsoftClientId, StandardCharsets.UTF_8) +
                    "&response_type=code" +
                    "&redirect_uri=" + encodedRedirect +
                    "&response_mode=query" +
                    "&scope=" + URLEncoder.encode("openid profile email User.Read", StandardCharsets.UTF_8);
        }

        return new OAuthProviderInfo(
                !googleClientId.isEmpty(),
                !microsoftClientId.isEmpty(),
                googleUrl,
                msUrl
        );
    }

    public AuthResponse authenticate(OAuthLoginRequest request) {
        String provider = request.provider() != null ? request.provider().trim().toLowerCase(Locale.ROOT) : "";
        if (!provider.equals("google") && !provider.equals("microsoft")) {
            throw new BadRequestException("Unsupported OAuth provider: " + provider);
        }

        // Demo / test mode fallback if requested or if credentials are dummy
        if ((request.code() != null && (request.code().startsWith("demo_") || request.code().startsWith("mock_"))) ||
            (request.idToken() != null && request.idToken().startsWith("demo_"))) {
            return handleDemoLogin(provider);
        }

        OAuthUserProfile profile;
        if (provider.equals("google")) {
            profile = authenticateGoogle(request);
        } else {
            profile = authenticateMicrosoft(request);
        }

        if (profile == null || profile.email() == null || profile.email().isBlank()) {
            throw new UnauthorizedException("Could not retrieve email from " + provider + " account");
        }

        String normalizedEmail = profile.email().trim().toLowerCase(Locale.ROOT);
        UserAccount user = userStore.findOrCreateOAuthUser(
                profile.fullName(),
                normalizedEmail,
                provider.toUpperCase(Locale.ROOT),
                profile.providerId(),
                profile.avatarUrl()
        );

        return authService.issueTokens(user, false);
    }

    private OAuthUserProfile authenticateGoogle(OAuthLoginRequest request) {
        if (googleClientId.isEmpty()) {
            log.warn("Google OAuth attempted but GOOGLE_CLIENT_ID is not configured in environment. Using demo profile.");
            return new OAuthUserProfile("Alex Scholar", "alex.scholar@gmail.com", "google-demo-123", null);
        }

        try {
            // If ID Token is directly passed (e.g. from Google One Tap or GIS)
            if (request.idToken() != null && !request.idToken().isBlank()) {
                String tokenInfoJson = restClient.get()
                        .uri("https://oauth2.googleapis.com/tokeninfo?id_token=" + request.idToken())
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(tokenInfoJson);
                String email = root.path("email").asText();
                String name = root.path("name").asText(email.split("@")[0]);
                String sub = root.path("sub").asText();
                String picture = root.path("picture").asText(null);
                return new OAuthUserProfile(name, email, sub, picture);
            }

            // Otherwise exchange code
            if (request.code() == null || request.code().isBlank()) {
                throw new BadRequestException("Missing authorization code for Google login");
            }

            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("code", request.code());
            params.add("client_id", googleClientId);
            params.add("client_secret", googleClientSecret);
            params.add("redirect_uri", request.redirectUri());
            params.add("grant_type", "authorization_code");

            String tokenResponse = restClient.post()
                    .uri("https://oauth2.googleapis.com/token")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(params)
                    .retrieve()
                    .body(String.class);

            JsonNode tokenNode = objectMapper.readTree(tokenResponse);
            String accessToken = tokenNode.path("access_token").asText();

            String userInfoJson = restClient.get()
                    .uri("https://www.googleapis.com/oauth2/v3/userinfo")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(String.class);

            JsonNode userNode = objectMapper.readTree(userInfoJson);
            String email = userNode.path("email").asText();
            String name = userNode.path("name").asText(email.split("@")[0]);
            String sub = userNode.path("sub").asText();
            String picture = userNode.path("picture").asText(null);
            return new OAuthUserProfile(name, email, sub, picture);

        } catch (Exception ex) {
            log.error("Google OAuth token exchange failed: {}", ex.getMessage());
            throw new UnauthorizedException("Google authentication failed: " + ex.getMessage());
        }
    }

    private OAuthUserProfile authenticateMicrosoft(OAuthLoginRequest request) {
        if (microsoftClientId.isEmpty()) {
            log.warn("Microsoft OAuth attempted but MICROSOFT_CLIENT_ID is not configured in environment. Using demo profile.");
            return new OAuthUserProfile("Taylor Student", "taylor.student@outlook.com", "microsoft-demo-456", null);
        }

        try {
            if (request.code() == null || request.code().isBlank()) {
                throw new BadRequestException("Missing authorization code for Microsoft login");
            }

            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("client_id", microsoftClientId);
            params.add("client_secret", microsoftClientSecret);
            params.add("code", request.code());
            params.add("redirect_uri", request.redirectUri());
            params.add("grant_type", "authorization_code");

            String tokenUrl = "https://login.microsoftonline.com/" + microsoftTenantId + "/oauth2/v2.0/token";
            String tokenResponse = restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(params)
                    .retrieve()
                    .body(String.class);

            JsonNode tokenNode = objectMapper.readTree(tokenResponse);
            String accessToken = tokenNode.path("access_token").asText();

            // Call Microsoft Graph API for user profile
            String graphMe = restClient.get()
                    .uri("https://graph.microsoft.com/v1.0/me")
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(String.class);

            JsonNode userNode = objectMapper.readTree(graphMe);
            String email = userNode.path("mail").asText();
            if (email == null || email.isBlank()) {
                email = userNode.path("userPrincipalName").asText();
            }
            String name = userNode.path("displayName").asText(email.split("@")[0]);
            String id = userNode.path("id").asText();

            return new OAuthUserProfile(name, email, id, null);

        } catch (Exception ex) {
            log.error("Microsoft OAuth exchange failed: {}", ex.getMessage());
            throw new UnauthorizedException("Microsoft authentication failed: " + ex.getMessage());
        }
    }

    private AuthResponse handleDemoLogin(String provider) {
        String email;
        String name;
        if (provider.equals("google")) {
            email = "demo.google.user@studygenie.ai";
            name = "Google Student";
        } else {
            email = "demo.windows.user@studygenie.ai";
            name = "Windows Student";
        }
        UserAccount user = userStore.findOrCreateOAuthUser(
                name,
                email,
                provider.toUpperCase(Locale.ROOT),
                "demo-" + provider + "-id",
                null
        );
        return authService.issueTokens(user, false);
    }

    public record OAuthUserProfile(
            String fullName,
            String email,
            String providerId,
            String avatarUrl
    ) {}
}
