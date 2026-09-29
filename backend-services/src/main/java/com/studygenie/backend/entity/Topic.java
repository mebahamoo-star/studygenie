package com.studygenie.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Entity
@Table(name = "topics", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"syllabus_id", "order_index"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Topic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "syllabus_id", nullable = false)
    private Syllabus syllabus;

    @NotBlank
    @Size(max = 255)
    @Column(name = "chapter_title", nullable = false, length = 255)
    private String chapterTitle;

    @NotNull
    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @NotNull
    @Column(name = "estimated_hours", nullable = false)
    private Double estimatedHours;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Topic)) return false;
        Topic that = (Topic) o;
        return id != null && id.equals(that.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
