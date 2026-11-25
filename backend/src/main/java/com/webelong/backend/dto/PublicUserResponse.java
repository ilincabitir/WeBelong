package com.webelong.backend.dto;

import com.webelong.backend.model.User;

import java.time.Instant;

public record PublicUserResponse(
        Long id,
        String username,
        String displayName,
        String bio,
        String avatarUrl,
        String coverUrl,
        String themeColor,
        String fontFamily,
        Instant createdAt
) {
    public static PublicUserResponse from(User user) {
        return new PublicUserResponse(
                user.getId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getCoverUrl(),
                user.getThemeColor(),
                user.getFontFamily(),
                user.getCreatedAt()
        );
    }
}