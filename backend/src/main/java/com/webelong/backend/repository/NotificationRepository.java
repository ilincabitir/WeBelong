package com.webelong.backend.repository;

import com.webelong.backend.model.Notification;
import com.webelong.backend.model.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @EntityGraph(attributePaths = "actor")
    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(
            Long recipientId, Pageable pageable);

    long countByRecipientIdAndReadFalse(Long recipientId);

    @EntityGraph(attributePaths = "actor")
    Optional<Notification> findByIdAndRecipientId(Long id, Long recipientId);

    @Modifying
    @Query("""
            update Notification n
            set n.read = true
            where n.recipient.id = :recipientId
              and n.read = false
            """)
    int markAllRead(@Param("recipientId") Long recipientId);

    @Modifying
    @Query("""
            update Notification n
            set n.read = true
            where n.recipient.id = :recipientId
              and n.actor.id = :actorId
              and n.type = :type
              and n.read = false
            """)
    int markReadByActor(@Param("recipientId") Long recipientId,
                        @Param("actorId") Long actorId,
                        @Param("type") NotificationType type);

    @Modifying
    @Query("""
            delete from Notification n
            where n.recipient.id = :recipientId
            """)
    int deleteAllForRecipient(@Param("recipientId") Long recipientId);

    void deleteByPostId(Long postId);
}