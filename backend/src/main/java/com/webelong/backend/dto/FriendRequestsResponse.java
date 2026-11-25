package com.webelong.backend.dto;

import java.util.List;

public record FriendRequestsResponse(
        List<FriendshipDto> incoming,
        List<FriendshipDto> outgoing
) {}