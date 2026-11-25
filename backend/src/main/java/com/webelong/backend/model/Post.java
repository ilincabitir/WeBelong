package com.webelong.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(length = 2000)
    private String content;

    @Column(length = 500)
    private String imageUrl;

    @Column(nullable = false, length = 7)
    @Builder.Default
    private String backgroundColor = "#ffffff";

    @Column(nullable = false, length = 7)
    @Builder.Default
    private String textColor = "#1f1f1f";

    @Column(nullable = false, length = 40)
    @Builder.Default
    private String fontFamily = "system-ui";

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}