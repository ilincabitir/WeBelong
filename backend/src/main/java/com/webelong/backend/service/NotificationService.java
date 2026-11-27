package com.webelong.backend.service;

import com.webelong.backend.dto.NotificationResponse;
import com.webelong.backend.dto.PageResponse;
import com.webelong.backend.exception.ApiException;
import com.webelong.backend.model.Notification;
import com.webelong.backend.model.NotificationType;
import com.webelong.backend.model.Post;
import com.webelong.backend.model.User;
import com.webelong.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notifications;

    @Transactional
    public void notifyFriendRequest(User requester, User addressee) {
        if (requester.getId().equals(addressee.getId())) {
            return;
        }

        notifications.save(Notification.builder()
                .recipient(addressee)
                .actor(requester)
                .type(NotificationType.FRIEND_REQUEST)
                .read(false)
                .build());
    }

    @Transactional
    public void notifyComment(User commenter, Post post) {
        User author = post.getAuthor();

        if (author.getId().equals(commenter.getId())) {
            return;
        }

        notifications.save(Notification.builder()
                .recipient(author)
                .actor(commenter)
                .type(NotificationType.COMMENT)
                .postId(post.getId())
                .read(false)
                .build());
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(User current, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);

        Page<Notification> result = notifications
                .findByRecipientIdOrderByCreatedAtDesc(
                        current.getId(), PageRequest.of(safePage, safeSize));

        return PageResponse.from(result.map(NotificationResponse::from));
    }

    @Transactional(readOnly = true)
    public long unreadCount(User current) {
        return notifications.countByRecipientIdAndReadFalse(current.getId());
    }

    @Transactional
    public void markRead(User current, Long id) {
        Notification notification = notifications
                .findByIdAndRecipientId(id, current.getId())
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "Notification not found"));

        if (!notification.isRead()) {
            notification.setRead(true);
        }
    }

    @Transactional
    public void markAllRead(User current) {
        notifications.markAllRead(current.getId());
    }

    @Transactional
    public void markFriendRequestRead(User recipient, Long actorId) {
        notifications.markReadByActor(
                recipient.getId(), actorId, NotificationType.FRIEND_REQUEST);
    }

    @Transactional
    public void clearAll(User current) {
        notifications.deleteAllForRecipient(current.getId());
    }

    @Transactional
    public void deleteForPost(Long postId) {
        notifications.deleteByPostId(postId);
    }
}