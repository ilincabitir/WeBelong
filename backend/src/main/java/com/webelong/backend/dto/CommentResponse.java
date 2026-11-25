package com.webelong.backend.dto;

import com.webelong.backend.model.Comment;

import java.time.Instant;

public record CommentResponse(
        Long id,
        PublicUserResponse author,
        String content,
        String imageUrl,
        Instant createdAt
) {
    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                PublicUserResponse.from(comment.getAuthor()),
                comment.getContent(),
                comment.getImageUrl(),
                comment.getCreatedAt()
        );
    }
}