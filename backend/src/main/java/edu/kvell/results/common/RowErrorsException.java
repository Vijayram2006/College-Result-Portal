package edu.kvell.results.common;

import java.util.List;

/** A submitted sheet had bad rows; nothing was saved. Returned as 422 with every row error. */
public class RowErrorsException extends RuntimeException {

    public record RowError(int row, String regNo, String field, String error) {
    }

    private final List<RowError> errors;

    public RowErrorsException(List<RowError> errors) {
        super(errors.size() + " rows have errors");
        this.errors = List.copyOf(errors);
    }

    public List<RowError> getErrors() {
        return errors;
    }
}
