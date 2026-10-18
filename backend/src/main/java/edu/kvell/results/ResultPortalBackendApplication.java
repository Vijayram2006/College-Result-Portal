package edu.kvell.results;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ResultPortalBackendApplication {

	// Windows maps IST to the legacy "Asia/Calcutta", which PostgreSQL 17 rejects at connect time. In a static block so
	// tests (which never call main) get it too.
	static {
		if ("Asia/Calcutta".equals(TimeZone.getDefault().getID())) {
			TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
		}
	}

	public static void main(String[] args) {
		SpringApplication.run(ResultPortalBackendApplication.class, args);
	}

}
