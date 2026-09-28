package com.studygenie.backend.dto;

/**
 * Details about a validation error on a specific field.
 */
public class FieldErrorDetail {
    private String field;
    private String message;

    public FieldErrorDetail() {
    }

    public FieldErrorDetail(String field, String message) {
        this.field = field;
        this.message = message;
    }

    public String getField() {
        return field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
