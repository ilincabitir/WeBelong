package com.webelong.backend.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PostRequest(
        @Size(max = 2000, message = "Post must be at most 2000 characters")
        String content,

        @Size(max = 500, message = "Image URL is too long")
        String imageUrl,

        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Background must be #RRGGBB")
        String backgroundColor,

        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Text colour must be #RRGGBB")
        String textColor,

        @Size(max = 40, message = "Font name is too long")
        String fontFamily
) {}