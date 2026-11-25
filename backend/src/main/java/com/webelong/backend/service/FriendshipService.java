package com.webelong.backend.service;

import com.webelong.backend.dto.FriendRequestsResponse;
import com.webelong.backend.dto.FriendStatusResponse;
import com.webelong.backend.dto.FriendshipDto;
import com.webelong.backend.dto.PublicUserResponse;
import com.webelong.backend.exception.ApiException;
import com.webelong.backend.model.Friendship;
import com.webelong.backend.model.FriendshipStatus;
import com.webelong.backend.model.User;
import com.webelong.backend.repository.FriendshipRepository;
import com.webelong.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendships;
    private final UserRepository users;

    @Transactional
    public FriendshipDto sendRequest(User current, Long targetId) {
        if (current.getId().equals(targetId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot add yourself");
        }

        User target = users.findById(targetId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        Optional<Friendship> existing = findBetween(current.getId(), targetId);

        if (existing.isPresent()) {
            Friendship friendship = existing.get();
            if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
                throw new ApiException(HttpStatus.CONFLICT, "You are already friends");
            }
            if (friendship.getRequester().getId().equals(current.getId())) {
                throw new ApiException(HttpStatus.CONFLICT, "Request already pending");
            }
            throw new ApiException(HttpStatus.CONFLICT,
                    "This user already sent you a request — accept it instead");
        }

        Friendship friendship = Friendship.builder()
                .requester(current)
                .addressee(target)
                .status(FriendshipStatus.PENDING)
                .build();

        friendships.save(friendship);
        return toDto(friendship, current.getId());
    }

    @Transactional(readOnly = true)
    public FriendRequestsResponse getRequests(User current) {
        List<FriendshipDto> incoming = friendships
                .findByAddresseeIdAndStatusOrderByCreatedAtDesc(
                        current.getId(), FriendshipStatus.PENDING)
                .stream()
                .map(f -> toDto(f, current.getId()))
                .toList();

        List<FriendshipDto> outgoing = friendships
                .findByRequesterIdAndStatusOrderByCreatedAtDesc(
                        current.getId(), FriendshipStatus.PENDING)
                .stream()
                .map(f -> toDto(f, current.getId()))
                .toList();

        return new FriendRequestsResponse(incoming, outgoing);
    }

    @Transactional
    public FriendshipDto accept(User current, Long requestId) {
        Friendship friendship = friendships.findById(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Request not found"));

        if (!friendship.getAddressee().getId().equals(current.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Only the recipient can accept this request");
        }
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "Request is no longer pending");
        }

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        friendship.setRespondedAt(Instant.now());
        return toDto(friendship, current.getId());
    }

    @Transactional
    public void decline(User current, Long requestId) {
        Friendship friendship = friendships.findById(requestId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Request not found"));

        if (!friendship.getAddressee().getId().equals(current.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Only the recipient can decline this request");
        }
        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "Request is no longer pending");
        }

        friendships.delete(friendship);
    }

    @Transactional(readOnly = true)
    public List<PublicUserResponse> getFriends(User current) {
        return friendships.findAllForUser(current.getId(), FriendshipStatus.ACCEPTED)
                .stream()
                .map(f -> PublicUserResponse.from(otherUser(f, current.getId())))
                .sorted(Comparator.comparing(
                        PublicUserResponse::displayName,
                        String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public void unfriend(User current, Long otherId) {
        Friendship friendship = friendships
                .findAllForUser(current.getId(), FriendshipStatus.ACCEPTED)
                .stream()
                .filter(f -> otherUser(f, current.getId()).getId().equals(otherId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "You are not friends"));

        friendships.delete(friendship);
    }

    @Transactional(readOnly = true)
    public FriendStatusResponse status(User current, Long otherId) {
        if (current.getId().equals(otherId)) {
            return new FriendStatusResponse("NONE");
        }

        return findBetween(current.getId(), otherId)
                .map(f -> {
                    if (f.getStatus() == FriendshipStatus.ACCEPTED) {
                        return new FriendStatusResponse("FRIENDS");
                    }
                    boolean outgoing = f.getRequester().getId().equals(current.getId());
                    return new FriendStatusResponse(outgoing ? "OUTGOING" : "INCOMING");
                })
                .orElseGet(() -> new FriendStatusResponse("NONE"));
    }

    /** Used by posts/comments to decide who may see and comment. */
    @Transactional(readOnly = true)
    public boolean areFriends(Long firstId, Long secondId) {
        return findBetween(firstId, secondId)
                .map(f -> f.getStatus() == FriendshipStatus.ACCEPTED)
                .orElse(false);
    }

    /** Accepted friend ids, for tomorrow's feed query. */
    @Transactional(readOnly = true)
    public List<Long> friendIds(Long userId) {
        return friendships.findAllForUser(userId, FriendshipStatus.ACCEPTED)
                .stream()
                .map(f -> otherUser(f, userId).getId())
                .toList();
    }

    private Optional<Friendship> findBetween(Long firstId, Long secondId) {
        Optional<Friendship> direct =
                friendships.findByRequesterIdAndAddresseeId(firstId, secondId);
        if (direct.isPresent()) {
            return direct;
        }
        return friendships.findByRequesterIdAndAddresseeId(secondId, firstId);
    }

    private User otherUser(Friendship friendship, Long viewerId) {
        return friendship.getRequester().getId().equals(viewerId)
                ? friendship.getAddressee()
                : friendship.getRequester();
    }

    private FriendshipDto toDto(Friendship friendship, Long viewerId) {
        return new FriendshipDto(
                friendship.getId(),
                PublicUserResponse.from(otherUser(friendship, viewerId)),
                friendship.getStatus().name(),
                friendship.getCreatedAt()
        );
    }
}