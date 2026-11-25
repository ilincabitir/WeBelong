package com.webelong.backend.controller;

import com.webelong.backend.dto.FriendRequestsResponse;
import com.webelong.backend.dto.FriendStatusResponse;
import com.webelong.backend.dto.FriendshipDto;
import com.webelong.backend.dto.PublicUserResponse;
import com.webelong.backend.model.User;
import com.webelong.backend.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/friends")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;

    @GetMapping
    public List<PublicUserResponse> friends(@AuthenticationPrincipal User current) {
        return friendshipService.getFriends(current);
    }

    @GetMapping("/requests")
    public FriendRequestsResponse requests(@AuthenticationPrincipal User current) {
        return friendshipService.getRequests(current);
    }

    @PostMapping("/requests/{userId}")
    @ResponseStatus(HttpStatus.CREATED)
    public FriendshipDto sendRequest(@AuthenticationPrincipal User current,
                                     @PathVariable Long userId) {
        return friendshipService.sendRequest(current, userId);
    }

    @PostMapping("/requests/{requestId}/accept")
    public FriendshipDto accept(@AuthenticationPrincipal User current,
                                @PathVariable Long requestId) {
        return friendshipService.accept(current, requestId);
    }

    @PostMapping("/requests/{requestId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(@AuthenticationPrincipal User current,
                        @PathVariable Long requestId) {
        friendshipService.decline(current, requestId);
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfriend(@AuthenticationPrincipal User current,
                         @PathVariable Long userId) {
        friendshipService.unfriend(current, userId);
    }

    @GetMapping("/status/{userId}")
    public FriendStatusResponse status(@AuthenticationPrincipal User current,
                                       @PathVariable Long userId) {
        return friendshipService.status(current, userId);
    }
}