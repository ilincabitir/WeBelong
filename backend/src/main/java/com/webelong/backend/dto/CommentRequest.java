package com.webelong.backend.dto;

import jakarta.validation.constraints.Size;

public record CommentRequest(
        @Size(max = 1000, message = "Comment must be at most 1000 characters")
        String content,

        @Size(max = 500, message = "Image URL is too long")
        String imageUrl
) {}