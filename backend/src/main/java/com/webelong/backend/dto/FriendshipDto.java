package com.webelong.backend.dto;

import java.time.Instant;

public record FriendshipDto(
        Long id,
        PublicUserResponse user,
        String status,
        Instant createdAt
) {}