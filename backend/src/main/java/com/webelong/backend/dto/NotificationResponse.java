package com.webelong.backend.dto;

import com.webelong.backend.model.Notification;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String type,
        PublicUserResponse actor,
        Long postId,
        boolean read,
        Instant createdAt
) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType().name(),
                PublicUserResponse.from(notification.getActor()),
                notification.getPostId(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}