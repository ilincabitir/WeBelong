package com.webelong.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(

        @NotBlank(message = "Display name is required")
        @Size(max = 60, message = "Display name must be at most 60 characters")
        String displayName,

        @Size(max = 300, message = "Bio must be at most 300 characters")
        String bio,

        @Size(max = 500, message = "Avatar URL is too long")
        String avatarUrl,

        @Size(max = 500, message = "Cover URL is too long")
        String coverUrl,

        @NotBlank(message = "Theme colour is required")
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "Theme colour must be #RRGGBB")
        String themeColor,

        @NotBlank(message = "Font is required")
        @Size(max = 40, message = "Font name is too long")
        String fontFamily
) {}