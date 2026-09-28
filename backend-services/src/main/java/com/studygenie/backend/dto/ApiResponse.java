package com.studygenie.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * Generic API response envelope.
 *
 * @param <T> the type of the response data
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final String message;
    private final T data;
    private final Instant timestamp;
    private final List<FieldErrorDetail> errors;

    private ApiResponse(boolean success, String message, T data, List<FieldErrorDetail> errors) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.timestamp = Instant.now();
        this.errors = errors;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public T getData() {
        return data;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public List<FieldErrorDetail> getErrors() {
        return errors;
    }

    /**
     * Creates a success response with data.
     *
     * @param data the response data
     * @param <T>  the data type
     * @return ApiResponse
     */
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, null, data, null);
    }

    /**
     * Creates a success response with message and data.
     *
     * @param message the success message
     * @param data    the response data
     * @param <T>     the data type
     * @return ApiResponse
     */
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null);
    }

    /**
     * Creates an error response with a message.
     *
     * @param message the error message
     * @param <T>     the data type
     * @return ApiResponse
     */
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null, null);
    }

    /**
     * Creates an error response with a message and field errors.
     *
     * @param message the error message
     * @param errors  the list of field errors
     * @param <T>     the data type
     * @return ApiResponse
     */
    public static <T> ApiResponse<T> error(String message, List<FieldErrorDetail> errors) {
        return new ApiResponse<>(false, message, null, errors);
    }
}
