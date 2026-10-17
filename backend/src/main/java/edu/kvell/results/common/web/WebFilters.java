package edu.kvell.results.common.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Filters that run before Spring Security, in this order: the real client address, the request id (for logs),
 * /api/v1 to /api, then the per-address request rate limit.
 */
@Configuration
public class WebFilters {

    @Bean
    FilterRegistrationBean<ClientIpFilter> clientIpFilter(@Value("${app.client-ip-header:}") String header) {
        return register(new ClientIpFilter(header), Ordered.HIGHEST_PRECEDENCE);
    }

    @Bean
    FilterRegistrationBean<RequestIdFilter> requestIdFilter() {
        return register(new RequestIdFilter(), Ordered.HIGHEST_PRECEDENCE + 1);
    }

    @Bean
    FilterRegistrationBean<ApiVersionFilter> apiVersionFilter() {
        return register(new ApiVersionFilter(), Ordered.HIGHEST_PRECEDENCE + 2);
    }

    @Bean
    FilterRegistrationBean<RequestRateLimitFilter> requestRateLimitFilter(
            @Value("${app.rate-limit.public-per-minute:120}") int publicPerMinute,
            @Value("${app.rate-limit.signed-in-per-minute:600}") int signedInPerMinute) {
        return register(new RequestRateLimitFilter(publicPerMinute, signedInPerMinute), Ordered.HIGHEST_PRECEDENCE + 3);
    }

    private static <T extends jakarta.servlet.Filter> FilterRegistrationBean<T> register(T filter, int order) {
        FilterRegistrationBean<T> bean = new FilterRegistrationBean<>(filter);
        bean.setOrder(order);
        bean.addUrlPatterns("/*");
        return bean;
    }
}
