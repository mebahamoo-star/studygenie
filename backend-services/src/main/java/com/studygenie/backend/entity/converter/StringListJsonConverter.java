package com.studygenie.backend.entity.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.util.StringUtils;

import java.util.Collections;
import java.util.List;

@Converter
public class StringListJsonConverter implements AttributeConverter<List<String>, String> {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        if (attribute == null) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        if (!StringUtils.hasText(dbData) || "[]".equals(dbData)) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(dbData, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }
}
