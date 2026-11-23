package com.webelong.backend.dto;

import com.webelong.backend.model.User;

import java.time.Instant;

public record UserResponse(
        Long id,
        String username,
        String email,
        String displayName,
        String bio,
        String avatarUrl,
        String coverUrl,
        String themeColor,
        String fontFamily,
        Instant createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(), user.getUsername(), user.getEmail(),
                user.getDisplayName(), user.getBio(), user.getAvatarUrl(),
                user.getCoverUrl(), user.getThemeColor(), user.getFontFamily(),
                user.getCreatedAt()
        );
    }
}