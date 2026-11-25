package com.webelong.backend.repository;

import com.webelong.backend.model.Friendship;
import com.webelong.backend.model.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    Optional<Friendship> findByRequesterIdAndAddresseeId(Long requesterId, Long addresseeId);

    List<Friendship> findByRequesterIdAndStatusOrderByCreatedAtDesc(
            Long requesterId, FriendshipStatus status);

    List<Friendship> findByAddresseeIdAndStatusOrderByCreatedAtDesc(
            Long addresseeId, FriendshipStatus status);

    @Query("""
            select f from Friendship f
            where f.status = :status
              and (f.requester.id = :userId or f.addressee.id = :userId)
            """)
    List<Friendship> findAllForUser(@Param("userId") Long userId,
                                    @Param("status") FriendshipStatus status);
}