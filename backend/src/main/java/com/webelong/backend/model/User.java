package com.webelong.backend.model;


import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;


@Entity
@Table(name="users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String username;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @JsonIgnore
    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable=false, length=60)
    private String displayName;

    @Column(length = 300) private String bio;
    @Column(length = 500) private String avatarUrl;
    @Column(length = 500) private String coverUrl;

    @Column(nullable = false, length =7)
    @Builder.Default private String themeColor = "#1677ff";

    @Column(nullable=false, length=40)
    @Builder.Default private String fontFamily = "system-ui";

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if(createdAt==null) {
            createdAt = Instant.now();
        }
    }

}
