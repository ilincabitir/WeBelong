package com.webelong.backend.dto;

import com.webelong.backend.model.Post;

import java.time.Instant;

public record PostResponse(
        Long id,
        PublicUserResponse author,
        String content,
        String imageUrl,
        String backgroundColor,
        String textColor,
        String fontFamily,
        Instant createdAt,
        Instant updatedAt
) {
    public static PostResponse from(Post post) {
        return new PostResponse(
                post.getId(),
                PublicUserResponse.from(post.getAuthor()),
                post.getContent(),
                post.getImageUrl(),
                post.getBackgroundColor(),
                post.getTextColor(),
                post.getFontFamily(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}