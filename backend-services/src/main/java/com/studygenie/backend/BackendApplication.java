package com.studygenie.backend;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.net.URI;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BackendApplication {

	private static final Logger log = LoggerFactory.getLogger(BackendApplication.class);

	public static void main(String[] args) {
		loadDotenv();
		SpringApplication.run(BackendApplication.class, args);
	}

	private static void loadDotenv() {
		// Search for .env in current directory and up to 3 parent levels
		File current = new File(".").getAbsoluteFile();
		File envFile = null;
		for (int i = 0; i < 4; i++) {
			File candidate = new File(current, ".env");
			if (candidate.exists() && candidate.isFile()) {
				envFile = candidate;
				break;
			}
			current = current.getParentFile();
			if (current == null) break;
		}

		if (envFile != null) {
			log.info("Loading environment variables from: {}", envFile.getAbsolutePath());
			try (BufferedReader reader = new BufferedReader(new FileReader(envFile))) {
				String line;
				while ((line = reader.readLine()) != null) {
					line = line.trim();
					if (line.isEmpty() || line.startsWith("#")) continue;
					int eqIdx = line.indexOf('=');
					if (eqIdx > 0) {
						String key = line.substring(0, eqIdx).trim();
						String value = line.substring(eqIdx + 1).trim();
						if ((value.startsWith("\"") && value.endsWith("\"")) ||
							(value.startsWith("'") && value.endsWith("'"))) {
							value = value.substring(1, value.length() - 1);
						}
						if (System.getProperty(key) == null && System.getenv(key) == null) {
							System.setProperty(key, value);
						}
					}
				}
			} catch (Exception e) {
				log.warn("Could not read .env file: {}", e.getMessage());
			}
		}

		// Normalize Neon / PostgreSQL DATABASE_URL to JDBC format if present
		String dbUrl = System.getProperty("DATABASE_URL_UNPOOLED");
		if (dbUrl == null || dbUrl.isBlank()) {
			dbUrl = System.getenv("DATABASE_URL_UNPOOLED");
		}
		if (dbUrl == null || dbUrl.isBlank()) {
			dbUrl = System.getProperty("DATABASE_URL");
		}
		if (dbUrl == null || dbUrl.isBlank()) {
			dbUrl = System.getenv("DATABASE_URL");
		}

		if (dbUrl != null && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
			try {
				URI uri = URI.create(dbUrl.replaceFirst("^postgres(ql)?://", "http://"));
				String userInfo = uri.getUserInfo();
				if (userInfo != null && userInfo.contains(":")) {
					String[] parts = userInfo.split(":", 2);
					if (System.getProperty("spring.datasource.username") == null && System.getenv("SPRING_DATASOURCE_USERNAME") == null) {
						System.setProperty("spring.datasource.username", parts[0]);
					}
					if (System.getProperty("spring.datasource.password") == null && System.getenv("SPRING_DATASOURCE_PASSWORD") == null) {
						System.setProperty("spring.datasource.password", parts[1]);
					}
				}
				String host = uri.getHost();
				int port = uri.getPort() > 0 ? uri.getPort() : 5432;
				String path = uri.getPath();
				String dbName = (path != null && path.startsWith("/")) ? path.substring(1) : (path != null ? path : "neondb");
				String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + dbName + "?sslmode=require";

				if (System.getProperty("spring.datasource.url") == null && System.getenv("SPRING_DATASOURCE_URL") == null) {
					System.setProperty("spring.datasource.url", jdbcUrl);
				}
				System.setProperty("spring.datasource.driver-class-name", "org.postgresql.Driver");
				System.setProperty("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
				log.info("Configured Neon PostgreSQL JDBC DataSource from DATABASE_URL: jdbc:postgresql://{}:{}/{}", host, port, dbName);
			} catch (Exception e) {
				log.warn("Failed to parse DATABASE_URL for Neon PostgreSQL: {}", e.getMessage());
			}
		}
	}
}
