package edu.kvell.results.common.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

/**
 * Paging for every API endpoint that returns a list: ?page=0&size=50 returns one page, and X-Total-Count gives the
 * full count. Without those parameters the list is returned whole, but never more than MAX_ROWS rows (a larger
 * answer is cut and logged, so one request can never send an unbounded amount of data).
 */
@RestControllerAdvice
public class ListPaging implements ResponseBodyAdvice<Object> {

    public static final int MAX_ROWS = 5000;
    public static final int MAX_PAGE_SIZE = 500;
    private static final Logger log = LoggerFactory.getLogger(ListPaging.class);

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (!(body instanceof List<?> list) || !(request instanceof ServletServerHttpRequest servlet)) return body;
        HttpServletRequest http = servlet.getServletRequest();
        if (!"GET".equals(http.getMethod())) return body;
        response.getHeaders().set("X-Total-Count", String.valueOf(list.size()));
        Integer page = number(http.getParameter("page"));
        Integer size = number(http.getParameter("size"));
        if (page != null || size != null) {
            int s = Math.max(1, Math.min(MAX_PAGE_SIZE, size == null ? 50 : size));
            long from = (long) Math.max(0, page == null ? 0 : page) * s;
            if (from >= list.size()) return List.of();
            return list.subList((int) from, (int) Math.min(list.size(), from + s));
        }
        if (list.size() > MAX_ROWS) {
            log.warn("{} returned {} rows; cut to {}", http.getRequestURI(), list.size(), MAX_ROWS);
            return list.subList(0, MAX_ROWS);
        }
        return body;
    }

    private static Integer number(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
