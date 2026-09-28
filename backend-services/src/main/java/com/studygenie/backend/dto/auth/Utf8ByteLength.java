package com.studygenie.backend.dto.auth;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Target({FIELD})
@Retention(RUNTIME)
@Constraint(validatedBy = Utf8ByteLengthValidator.class)
@Documented
public @interface Utf8ByteLength {
    int max() default 72;
    String message() default "String exceeds maximum UTF-8 byte length";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
