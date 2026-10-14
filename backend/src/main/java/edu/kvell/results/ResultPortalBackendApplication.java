package edu.kvell.results;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ResultPortalBackendApplication {

	public static void main(String[] args) {
		// Windows maps IST to the legacy "Asia/Calcutta", which PostgreSQL 17 rejects at connect time
		if ("Asia/Calcutta".equals(TimeZone.getDefault().getID())) {
			TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
		}
		SpringApplication.run(ResultPortalBackendApplication.class, args);
	}

}
