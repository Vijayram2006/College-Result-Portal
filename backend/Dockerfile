# Spring Boot backend image (used by Render). Build: docker build -t result-portal-backend backend
# Base images are pinned by digest, so a rebuild always uses exactly the same image. To update them:
#   docker buildx imagetools inspect <image:tag>   and paste the new Digest here (after testing).
FROM maven:3.9.9-eclipse-temurin-21@sha256:3a4ab3276a087bf276f79cae96b1af04f53731bec53fb2e651aca79e4b10211e AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:21-jre@sha256:227118764cccd3c3294617061aaa93a08309c63a395eefa83e6b35032992ea99
WORKDIR /app
RUN useradd --system --uid 10001 app
COPY --from=build /src/target/result-portal-backend-0.0.1-SNAPSHOT.jar app.jar
# Runs as an unprivileged user, never root
USER app
# Free hosting plans have ~512 MB of memory: keep the heap and thread stacks small. Times are shown in IST.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError -Duser.timezone=Asia/Kolkata"
ENV TZ=Asia/Kolkata
EXPOSE 8080
# Health: the platform calls /healthz (Render health check path); the slim JRE image has no curl/wget for a
# Docker HEALTHCHECK.
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
